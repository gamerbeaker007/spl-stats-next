import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { TERMS_EFFECTIVE_DATE, TERMS_LAST_UPDATED_DATE } from "@/lib/shared/terms";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | SPL Stats",
  description: "Terms of Service for SPL Stats and SPL Land Manager.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function Para({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="body1" color="text.secondary" paragraph>
      {children}
    </Typography>
  );
}

export default function TermsPage() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Terms of Service
        </Typography>

        <Typography variant="body2" color="text.secondary">
          Effective date: {TERMS_EFFECTIVE_DATE} &nbsp;·&nbsp; Last updated:{" "}
          {TERMS_LAST_UPDATED_DATE}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your use of{" "}
          <Link href="https://spl-stats.com">spl-stats.com</Link> and{" "}
          <Link href="https://land.spl-stats.com">land.spl-stats.com</Link> (collectively, the
          &ldquo;Services&rdquo;), operated by{" "}
          <Link href="https://peakd.com/@beaker007" target="_blank" rel="noopener noreferrer">
            @beaker007
          </Link>
          . By accessing or using the Services, you agree to these Terms.
        </Typography>
      </Box>

      <Divider sx={{ mb: 4 }} />

      <Section title="1. Introduction">
        <Para>
          SPL Stats and SPL Land Manager are independent third-party tools for Splinterlands and the
          Hive blockchain. The Services provide features for viewing and analysing account and land
          data, monitoring accounts, managing game assets, and interacting with marketplace,
          Splinterlands, and blockchain functionality.
        </Para>
        <Para>
          The Services are not affiliated with, endorsed by, or officially connected to
          Splinterlands, Hive, or their respective operators unless explicitly stated otherwise.
        </Para>
      </Section>

      <Section title="2. Privacy and Stored Data">
        <Para>
          SPL Stats may store Splinterlands and Hive account information required to provide its
          features, including monitored accounts, account and asset data, historical data,
          application settings, authentication information, and operational records. Much of the
          Splinterlands and Hive account data processed by the Services may already be publicly
          available through Splinterlands APIs or the Hive blockchain.
        </Para>
        <Para>
          SPL Land Manager may store information about actions performed through the Service and
          their results, including transaction references, statuses, and operational history needed
          to provide Land Manager functionality.
        </Para>
        <Para>
          The Services may store authentication tokens or other authentication information where
          required to provide authenticated features. At the time these Terms were published, the
          Services do not use third-party advertising or behavioural tracking services.
        </Para>
      </Section>

      <Section title="3. Authentication, Credentials, and Account Access">
        <Para>
          The Services may use Hive Keychain, Splinterlands authentication, authentication tokens,
          or delegated Hive authority to provide supported features. Certain features may allow you
          to authorize the Services to perform supported actions on your behalf.
        </Para>
        <Para>
          You are responsible for understanding the permissions you grant and for deciding whether
          you are comfortable granting or storing authentication information. You should never
          provide a Hive owner key, active key, or password unless you are fully aware of the
          purpose for doing so, and you accept the responsibility associated with providing such
          information.
        </Para>
        <Para>
          Authentication tokens, credentials, delegated authority, or other authentication
          mechanisms may create additional security risk. While reasonable measures are used to
          protect the Services and stored information, no storage or security system can be
          guaranteed to be completely secure. You accept these risks when using authenticated or
          delegated-authority features.
        </Para>
      </Section>

      <Section title="4. Marketplace and Blockchain Transactions">
        <Para>
          The Services may allow you to initiate, facilitate, automate, or manage Splinterlands,
          marketplace, rental, or Hive blockchain actions. You are responsible for reviewing and
          authorising actions and transactions performed through your account.
        </Para>
        <Para>
          Blockchain transactions may be irreversible. SPL Stats cannot guarantee that a transaction
          will execute correctly and may not be able to cancel, reverse, or recover a transaction or
          digital assets after an action has been submitted or confirmed.
        </Para>
        <Para>
          Where you explicitly enable automated, bulk, or delegated functionality, supported actions
          may be performed programmatically on your behalf. You remain responsible for understanding
          and enabling such functionality.
        </Para>
      </Section>

      <Section title="5. Use at Your Own Risk">
        <Para>
          THE SERVICES ARE PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT
          WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE
          LAW. YOU USE THE SERVICES ENTIRELY AT YOUR OWN RISK.
        </Para>
        <Para>
          SPL Stats does not guarantee that the Services will be uninterrupted, error-free, secure,
          or free from bugs, or that information, calculations, marketplace data, transactions, or
          other results will be accurate, complete, current, or suitable for any particular purpose.
        </Para>
        <Para>
          Information provided through the Services is for informational and application
          functionality purposes only and should not be considered financial, investment, legal, or
          tax advice.
        </Para>
      </Section>

      <Section title="6. Third-Party Services and API Data">
        <Para>
          The Services rely on third-party systems including Splinterlands, Hive, blockchain
          networks, APIs, marketplaces, Hive nodes, and related services. SPL Stats does not control
          these third parties and does not guarantee their availability, accuracy, security,
          completeness, or continued operation.
        </Para>
        <Para>
          Information displayed by the Services may be delayed, cached, incomplete, outdated, or
          incorrect because of API errors, rate limits, blockchain conditions, third-party changes,
          or data-processing errors. You should independently verify important information before
          making financial decisions or authorising transactions.
        </Para>
      </Section>

      <Section title="7. Security and Limitation of Liability">
        <Para>
          No internet-connected service is completely secure. SPL Stats cannot guarantee that the
          Services or their infrastructure will never contain vulnerabilities or be affected by
          unauthorised access, hacking, malicious activity, data loss, credential compromise, or
          other security incidents.
        </Para>
        <Para>
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, SPL STATS AND ITS OPERATOR SHALL NOT BE
          LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES
          ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF, OR INABILITY TO USE, THE SERVICES.
        </Para>

        <Box component="ul" sx={{ color: "text.secondary", mb: 2 }}>
          {[
            "software bugs, errors, or incorrect application behaviour;",
            "incorrect, incomplete, outdated, or delayed information or calculations;",
            "failed, incorrectly constructed, unintended, or irreversible transactions;",
            "marketplace activity or changes in the value of digital assets;",
            "automated, bulk, or delegated actions performed where you enabled such functionality;",
            "decisions made in reliance on information provided by the Services;",
            "loss of profits, revenue, data, opportunities, credentials, or digital assets;",
            "loss, theft, or unintended transfer of digital assets;",
            "service outages, interruptions, or loss of availability;",
            "third-party API, Splinterlands, Hive, marketplace, or blockchain failures or changes;",
            "security incidents, unauthorised access, hacking, malicious activity, or infrastructure compromise;",
            "compromise of stored authentication information, tokens, credentials, or other data despite reasonable security measures; or",
            "user error.",
          ].map((item) => (
            <li key={item}>
              <Typography variant="body2" color="text.secondary">
                {item}
              </Typography>
            </li>
          ))}
        </Box>

        <Para>
          Some jurisdictions do not allow certain exclusions or limitations of liability. Where
          applicable, these limitations apply only to the maximum extent permitted by law.
        </Para>
      </Section>

      <Section title="8. User Conduct and Responsibilities">
        <Para>
          You agree to use the Services in accordance with applicable law and only with accounts and
          assets for which you have the necessary permissions and authority. You are responsible for
          actions taken using your account and for reviewing permissions, transactions, and
          authorisations before approving them.
        </Para>
        <Para>
          You may not attempt to gain unauthorised access to the Services, exploit vulnerabilities,
          intentionally disrupt the Services, defraud other users, impersonate SPL Stats or its
          operator, or use the Services for unlawful or malicious purposes. Access to the Services
          may be restricted or terminated in cases of misuse.
        </Para>
      </Section>

      <Section title="9. Availability and Termination">
        <Para>
          SPL Stats makes no guarantee that the Services or any individual feature will remain
          continuously available. Features may be changed, suspended, restricted, or discontinued at
          any time, including because of maintenance, security concerns, infrastructure failures, or
          changes to Splinterlands, Hive, APIs, or other third-party services.
        </Para>
      </Section>

      <Section title="10. Changes to These Terms">
        <Para>
          These Terms may be updated from time to time. The current version will be published on
          this page and the last-updated date will be changed when the Terms are materially revised.
          By continuing to use the Services after revised Terms become effective, you agree to the
          updated Terms to the extent permitted by applicable law.
        </Para>
      </Section>

      <Section title="11. Contact">
        <Para>
          Questions or concerns regarding these Terms can be directed to the SPL Stats operator via
          the Hive account{" "}
          <Link href="https://peakd.com/@beaker007" target="_blank" rel="noopener noreferrer">
            @beaker007
          </Link>
          .
        </Para>
      </Section>

      <Divider sx={{ mb: 3 }} />
    </Container>
  );
}
