import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  return {
    shop: session.shop,
    affiliateLoginUrl: `https://${session.shop}/apps/affiliate-login`,
    configuration: {
      leadDynoKey: Boolean(process.env.LEADDYNO_PRIVATE_KEY),
      customerLoginUrl: Boolean(process.env.CUSTOMER_LOGIN_URL),
      fallbackUrl: Boolean(process.env.NOT_AN_AFFILIATE_URL),
    },
  };
};

function StatusBadge({ ready }) {
  return (
    <s-badge tone={ready ? "success" : "critical"}>
      {ready ? "Ready" : "Action required"}
    </s-badge>
  );
}

export default function Index() {
  const { shop, affiliateLoginUrl, configuration } = useLoaderData();

  const configuredCount = Object.values(configuration).filter(Boolean).length;
  const isReady = configuredCount === 3;

  return (
    <s-page heading="LeadDyno Affiliate Login">
      <s-button
        slot="primary-action"
        href={affiliateLoginUrl}
        target="_blank"
      >
        Test affiliate login
      </s-button>

      <s-section>
        <s-stack direction="block" gap="base">
          <s-stack direction="inline" gap="base" alignItems="center">
            <s-heading>
              Affiliate dashboard access for your customers
            </s-heading>

            <StatusBadge ready={isReady} />
          </s-stack>

          <s-paragraph>
            This app securely matches a signed-in Shopify customer to their
            LeadDyno affiliate account and sends them directly to their
            affiliate dashboard.
          </s-paragraph>

          <s-paragraph>
            Storefront URL:{" "}
            <s-link href={affiliateLoginUrl} target="_blank">
              {affiliateLoginUrl}
            </s-link>
          </s-paragraph>
        </s-stack>
      </s-section>

      <s-section heading="How it works">
        <s-ordered-list>
          <s-list-item>
            A customer opens the affiliate login link in your storefront.
          </s-list-item>

          <s-list-item>
            Shopify verifies the request and identifies the signed-in customer.
          </s-list-item>

          <s-list-item>
            The app finds the customer&apos;s LeadDyno affiliate account by
            email.
          </s-list-item>

          <s-list-item>
            The customer is redirected to their LeadDyno dashboard.
          </s-list-item>
        </s-ordered-list>
      </s-section>

      <s-section heading="Configuration status">
        <s-stack direction="block" gap="base">
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack
              direction="inline"
              gap="base"
              alignItems="center"
              justifyContent="space-between"
            >
              <s-stack direction="block" gap="small-200">
                <s-heading>LeadDyno API key</s-heading>

                <s-paragraph>
                  Used server-side to find an affiliate by customer email.
                </s-paragraph>
              </s-stack>

              <StatusBadge ready={configuration.leadDynoKey} />
            </s-stack>
          </s-box>

          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack
              direction="inline"
              gap="base"
              alignItems="center"
              justifyContent="space-between"
            >
              <s-stack direction="block" gap="small-200">
                <s-heading>Customer login redirect</s-heading>

                <s-paragraph>
                  Where signed-out customers are sent before trying again.
                </s-paragraph>
              </s-stack>

              <StatusBadge ready={configuration.customerLoginUrl} />
            </s-stack>
          </s-box>

          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack
              direction="inline"
              gap="base"
              alignItems="center"
              justifyContent="space-between"
            >
              <s-stack direction="block" gap="small-200">
                <s-heading>Not-an-affiliate fallback</s-heading>

                <s-paragraph>
                  Where customers are sent when no matching affiliate is found.
                </s-paragraph>
              </s-stack>

              <StatusBadge ready={configuration.fallbackUrl} />
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      <s-section heading="Add the login link to your store">
        <s-paragraph>
          Add a navigation item, account-page button, or theme link that points
          to <s-text>/apps/affiliate-login</s-text>. Customers must be signed in
          to Shopify for the automatic lookup to work.
        </s-paragraph>

        <s-stack direction="inline" gap="base">
          <s-button
            href={`https://${shop}/admin/content/menus`}
            target="_blank"
          >
            Open store navigation
          </s-button>

          <s-button
            href={affiliateLoginUrl}
            target="_blank"
            variant="tertiary"
          >
            Open login URL
          </s-button>
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="Connection summary">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            <s-text>Store</s-text>
            <br />
            {shop}
          </s-paragraph>

          <s-paragraph>
            <s-text>App proxy</s-text>
            <br />
            /apps/affiliate-login
          </s-paragraph>

          <s-paragraph>
            <s-text>Required settings</s-text>
            <br />
            {configuredCount} of 3 configured
          </s-paragraph>
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="Expected outcomes">
        <s-unordered-list>
          <s-list-item>
            Signed-in affiliate: LeadDyno dashboard
          </s-list-item>

          <s-list-item>
            Signed-out customer: Shopify login page
          </s-list-item>

          <s-list-item>
            No affiliate match: configured fallback page
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);