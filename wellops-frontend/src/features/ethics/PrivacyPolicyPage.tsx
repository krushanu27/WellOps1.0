export function PrivacyPolicyPage() {
  return (
    <div style={{ padding: 24, maxWidth: 760 }}>
      <h1>Privacy Policy</h1>

      <div className="wo-prose">
        <h2>What Data We Collect</h2>
        <p>
          WellOps collects employee wellness data through voluntary surveys.
          This includes self-reported scores on workload, stress, sleep quality,
          mood, and overtime hours. We also collect basic account information
          (email, name, role, team assignment).
        </p>

        <h2>How We Use Your Data</h2>
        <p>
          Survey responses are used to generate aggregate wellness insights for
          team managers and administrators. Individual responses are{" "}
          <strong>never shared identifiably</strong> with managers or other
          employees.
        </p>

        <h2>Anonymization & K-Anonymity</h2>
        <p>
          We enforce a strict <strong>K-anonymity threshold of 5</strong>,
          meaning team-level analytics are only generated when at least 5
          members have responded. This prevents identification of individual
          responses in small teams.
        </p>

        <h2>Predictive Analytics</h2>
        <p>
          Our ML-powered burnout and productivity risk scores are generated
          from anonymized, aggregated data. Predictions are used as supportive
          tools — they never trigger automated decisions about employment,
          performance reviews, or compensation.
        </p>

        <h2>Consent & Control</h2>
        <ul>
          <li>
            You must provide explicit consent before your survey data is
            processed.
          </li>
          <li>
            You can revoke consent at any time — your future survey responses
            will not be included in analytics.
          </li>
          <li>
            All data access is logged in our audit trail for transparency.
          </li>
        </ul>

        <h2>Data Retention</h2>
        <p>
          Survey responses are retained for the duration of the active survey
          cycle. Aggregated analytics are retained for up to 12 months. Account
          data is retained while your account is active and deleted within 30
          days of account closure.
        </p>

        <h2>Your Rights</h2>
        <ul>
          <li>Right to access your personal data</li>
          <li>Right to withdraw consent at any time</li>
          <li>Right to request deletion of your data</li>
          <li>Right to know how your data is processed</li>
        </ul>

        <h2>Contact</h2>
        <p>
          For questions about this policy or to exercise your rights, contact
          your organization's WellOps administrator or email{" "}
          <strong>privacy@wellops.io</strong>.
        </p>
      </div>
    </div>
  );
}
