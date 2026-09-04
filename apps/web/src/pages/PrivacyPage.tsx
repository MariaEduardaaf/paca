import { LegalLayout } from "@/components/layout/LegalLayout";

export function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="May 10, 2026">
      <p>
        This policy describes how Paca Finance ("the app", "we") collects, uses,
        and protects information about its users. The app is offered worldwide
        through the App Store and the web at app.pacafinance.com.br.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account info</strong>: email address and the display name you
          provide at sign-up. Used to authenticate you and identify you to your
          partner inside a couple.
        </li>
        <li>
          <strong>Financial data</strong>: transactions you record (description,
          amount, currency, category, date, optional notes), monthly budgets,
          and recurring bills. This data is private to you and to your partner
          if you've joined a couple.
        </li>
        <li>
          <strong>Receipt and statement images</strong>: when you use the scan
          feature, the image is sent to Google Gemini for OCR/parsing and
          discarded immediately after the parsed data is returned. We do not
          store the images on our servers.
        </li>
        <li>
          <strong>Usage telemetry</strong>: which actions you take in the app
          (e.g. "scanned a receipt", "asked the purchase advisor"), including
          approximate token cost. Used internally to monitor cost and detect
          abuse.
        </li>
      </ul>

      <h2>What we do not collect</h2>
      <ul>
        <li>We do not track you across other apps or websites.</li>
        <li>We do not sell or share your data with advertisers.</li>
        <li>
          We do not access your photo library beyond the single image you pick
          for the scan feature.
        </li>
      </ul>

      <h2>How couple sharing works</h2>
      <p>
        When two users join the same couple, they share access to that couple's
        transactions, budgets, and shared categories. Each user can also keep{" "}
        <em>personal</em> data (transactions, budgets, categories marked as
        Personal in the app) which is never visible to the partner — enforced
        by row-level security in our database.
      </p>

      <h2>Where data lives</h2>
      <p>
        We use Supabase (Postgres + Auth) hosted on AWS as our database and
        authentication provider. Data is encrypted in transit (HTTPS) and at
        rest. AI scanning and the purchase advisor send transaction context to
        Google Gemini API; that data is processed by Google under its API
        terms and is not retained for model training under the API tier.
      </p>

      <h2>Your rights</h2>
      <ul>
        <li>
          <strong>Access and export</strong>: from Profile → Export, you can
          export your transactions to CSV at any time.
        </li>
        <li>
          <strong>Correction</strong>: edit or delete any transaction, budget,
          or category from inside the app.
        </li>
        <li>
          <strong>Deletion</strong>: from Profile → Danger zone → Delete account,
          you can permanently delete your account and your personal data. If
          you're in a couple, your partner keeps access to the shared data
          you've co-authored, but your name is removed from past transactions.
        </li>
      </ul>

      <h2>Children</h2>
      <p>
        Paca Finance is not directed at children under 13. We do not knowingly
        collect data from children under 13.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this policy. The "Updated" date at the top reflects the
        last change. Material changes will be announced in-app.
      </p>

      <h2>Contact</h2>
      <p>
        Questions, requests, or complaints: <a href="mailto:madualvesfr@gmail.com">madualvesfr@gmail.com</a>.
      </p>
    </LegalLayout>
  );
}
