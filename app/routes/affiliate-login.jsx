import { redirect } from "react-router";
import { authenticate } from "../shopify.server";

const CUSTOMER_QUERY = `#graphql
  query AffiliateLoginCustomer($id: ID!) {
    customer(id: $id) {
      id
      email
    }
  }
`;

export async function loader({ request }) {
  /*
   * This validates Shopify's app-proxy signature.
   *
   * Never read logged_in_customer_id before this authentication succeeds.
   */
  const { admin } = await authenticate.public.appProxy(request);

  const url = new URL(request.url);
  const customerId = url.searchParams.get("logged_in_customer_id");

  /*
   * Shopify normally includes the parameter as an empty string when no
   * storefront customer is logged in.
   */
  if (!customerId) {
    return redirectToCustomerLogin();
  }

  /*
   * `admin` can be undefined when Shopify has no stored offline session for
   * this shop, such as when the app is not installed correctly.
   */
  if (!admin) {
    console.error(
      "No Admin API context was available for the app-proxy request.",
    );

    return new Response("App installation session is unavailable.", {
      status: 503,
    });
  }

  const privateKey = process.env.LEADDYNO_PRIVATE_KEY;
  const fallbackUrl = process.env.NOT_AN_AFFILIATE_URL;

  if (!privateKey) {
    console.error("LEADDYNO_PRIVATE_KEY is not configured.");

    return new Response("Server configuration error.", {
      status: 500,
    });
  }

  if (!fallbackUrl) {
    console.error("NOT_AN_AFFILIATE_URL is not configured.");

    return new Response("Server configuration error.", {
      status: 500,
    });
  }

  try {
    /*
     * Shopify provides the numeric customer ID. GraphQL expects a global ID.
     */
    const graphqlCustomerId = `gid://shopify/Customer/${customerId}`;

    const customerResponse = await admin.graphql(CUSTOMER_QUERY, {
      variables: {
        id: graphqlCustomerId,
      },
    });

    const customerPayload = await customerResponse.json();

    if (customerPayload.errors?.length) {
      console.error(
        "Shopify customer query failed:",
        JSON.stringify(customerPayload.errors),
      );

      return new Response("Unable to retrieve customer information.", {
        status: 502,
      });
    }

    const customer = customerPayload.data?.customer;
    const email = customer?.email?.trim();

    if (!customer) {
      console.error("Shopify returned no customer for the signed ID.");

      return redirectToCustomerLogin();
    }

    if (!email) {
      console.error(
        "Customer email was empty or unavailable. Check read_customers and protected customer data access.",
      );

      return redirect(fallbackUrl);
    }

    const leadDynoUrl = new URL(
      "https://api.leaddyno.com/v1/affiliates/by_email",
    );

    leadDynoUrl.searchParams.set("email", email);
    leadDynoUrl.searchParams.set("key", privateKey);

    const leadDynoResponse = await fetch(leadDynoUrl, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!leadDynoResponse.ok) {
      const errorBody = await leadDynoResponse.text();

      console.error(
        "LeadDyno affiliate lookup failed:",
        leadDynoResponse.status,
        errorBody,
      );

      return redirect(fallbackUrl);
    }

    const affiliate = await leadDynoResponse.json();
    const dashboardUrl = affiliate?.affiliate_dashboard_url;

    if (!dashboardUrl) {
      console.error(
        "LeadDyno response did not include affiliate_dashboard_url.",
      );

      return redirect(fallbackUrl);
    }

    const destination = new URL(dashboardUrl);

    /*
     * Only redirect to HTTPS. Restrict the hostname further after confirming
     * the exact LeadDyno dashboard domain returned by your account.
     */
    if (destination.protocol !== "https:") {
      console.error("LeadDyno returned a non-HTTPS redirect URL.");

      return redirect(fallbackUrl);
    }

    return redirect(destination.toString());
  } catch (error) {
    console.error("Affiliate login failed:", error);

    return redirect(fallbackUrl);
  }
}

function redirectToCustomerLogin() {
  const loginUrl = process.env.CUSTOMER_LOGIN_URL;

  if (!loginUrl) {
    console.error("CUSTOMER_LOGIN_URL is not configured.");

    return new Response("Customer login URL is not configured.", {
      status: 500,
    });
  }

  return redirect(loginUrl);
}