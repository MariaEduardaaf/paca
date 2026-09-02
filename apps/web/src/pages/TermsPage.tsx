import { LegalLayout } from "@/components/layout/LegalLayout";

export function TermsPage() {
  return (
    <LegalLayout title="Terms of Use" updated="May 10, 2026">
      <p>
        By creating an account on Paca Finance ("the app") you agree to these
        terms. They govern your use of the iOS app and the web version at
        app.pacafinance.com.br.
      </p>

      <h2>Eligibility</h2>
      <p>
        You must be at least 13 years old to use the app. By signing up, you
        confirm that you are.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>One account per person. Don't share credentials.</li>
        <li>You're responsible for keeping your password secure.</li>
        <li>
          You can delete your account at any time from Profile → Danger zone.
          Deletion is permanent.
        </li>
      </ul>

      <h2>Your content</h2>
      <p>
        Transactions, budgets, and notes you enter belong to you. We don't claim
        any ownership over your financial data. You're responsible for the
        accuracy of what you record — Paca Finance is a personal finance
        organizer, not a tax or accounting tool.
      </p>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the app for anything illegal.</li>
        <li>Try to access another user's account or data.</li>
        <li>Reverse-engineer, scrape, or attempt to disrupt the service.</li>
        <li>
          Upload images that infringe copyright or contain non-consensual
          personal data of others.
        </li>
      </ul>

      <h2>AI features</h2>
      <p>
        The receipt scan and purchase advisor features rely on a third-party
        large language model (Google Gemini). Output may be incorrect; verify
        amounts and categories before saving. We do not guarantee accuracy of
        AI-generated suggestions.
      </p>

      <h2>Service availability</h2>
      <p>
        We provide the app "as is" and make no uptime guarantee. We may pause
        or discontinue features at any time, with reasonable notice when
        possible.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, Paca Finance is not liable for
        indirect, incidental, or consequential damages arising from your use
        of the app, including financial decisions made based on the app's
        information.
      </p>

      <h2>Termination</h2>
      <p>
        We may suspend or terminate accounts that violate these terms. You can
        terminate your own account at any time.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms. The "Updated" date reflects the last
        change. Continued use after changes constitutes acceptance.
      </p>

      <h2>Contact</h2>
      <p>
        Questions: <a href="mailto:madualvesfr@gmail.com">madualvesfr@gmail.com</a>.
      </p>
    </LegalLayout>
  );
}
