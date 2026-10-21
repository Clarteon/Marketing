import { fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { ChatWidgetSlot } from "@/components/ui/ChatWidgetSlot";
import { Footer } from "@/components/ui/Footer";
import { Header } from "@/components/ui/Header";
import { HomePage } from "@/components/pages/HomePage";
import { SolutionsPage } from "@/components/pages/SolutionsPage";
import { HowWeWorkPage } from "@/components/pages/HowWeWorkPage";
import { OurWorkPage } from "@/components/pages/OurWorkPage";
import { InsightsPage } from "@/components/pages/InsightsPage";
import { AboutPage } from "@/components/pages/AboutPage";
import { ContactPage } from "@/components/pages/ContactPage";
import { PrivacyPage } from "@/components/pages/PrivacyPage";
import { getPage, getPublished } from "@/lib/content";
import { parsePageData } from "@/lib/page-schemas";
import {
  contactSchema,
  homeSchema,
  howWeWorkSchema,
  listPageSchema,
  simplePageSchema,
  solutionsSchema,
} from "@/lib/page-schemas";

function Site({ children }: { children: ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      {children}
      <Footer />
      <ChatWidgetSlot />
    </>
  );
}

async function expectNoA11yViolations(container: HTMLElement) {
  // Colour contrast needs a real layout engine. The P1 pass checks it against
  // the running site; every structural rule stays enabled here.
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false } },
  });

  expect(results.violations).toEqual([]);
}

async function loadPage(slug: string) {
  const page = await getPage(slug);
  if (!page) throw new Error(`Missing published page: ${slug}`);
  return page;
}

describe("page accessibility", () => {
  it("Home", async () => {
    const page = await loadPage("home");
    const data = parsePageData(homeSchema, page);
    const { container } = render(
      <Site>
        <HomePage data={data} />
      </Site>,
    );

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Technology that starts with your problem.",
    );
    expect(screen.getByText("Your business-focused technology partner")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 }).querySelector("span")).toHaveTextContent(
      "problem.",
    );
    await expectNoA11yViolations(container);
  });

  it("Solutions", async () => {
    const page = await loadPage("solutions");
    const data = parsePageData(solutionsSchema, page);
    const { container } = render(
      <Site>
        <SolutionsPage data={data} />
      </Site>,
    );

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    await expectNoA11yViolations(container);
  });

  it("How we work", async () => {
    const page = await loadPage("how-we-work");
    const data = parsePageData(howWeWorkSchema, page);
    const { container } = render(
      <Site>
        <HowWeWorkPage data={data} />
      </Site>,
    );

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    await expectNoA11yViolations(container);
  });

  it("Our work", async () => {
    const page = await loadPage("our-work");
    const data = parsePageData(listPageSchema, page);
    const items = await getPublished("case-study");
    const { container } = render(
      <Site>
        <OurWorkPage data={data} body={page.body} items={items} />
      </Site>,
    );

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    await expectNoA11yViolations(container);
  });

  it("Insights", async () => {
    const page = await loadPage("insights");
    const data = parsePageData(listPageSchema, page);
    const items = await getPublished("insight");
    const { container } = render(
      <Site>
        <InsightsPage data={data} items={items} />
      </Site>,
    );

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    await expectNoA11yViolations(container);
  });

  it("About", async () => {
    const page = await loadPage("about");
    const data = parsePageData(simplePageSchema, page);
    const { container } = render(
      <Site>
        <AboutPage data={data} body={page.body} />
      </Site>,
    );

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    await expectNoA11yViolations(container);
  });

  it("Contact", async () => {
    const page = await loadPage("contact");
    const data = parsePageData(contactSchema, page);
    const { container } = render(
      <Site>
        <ContactPage data={data} />
      </Site>,
    );

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    await expectNoA11yViolations(container);
  });

  it("Privacy", async () => {
    const page = await loadPage("privacy");
    const data = parsePageData(simplePageSchema, page);
    const { container } = render(
      <Site>
        <PrivacyPage data={data} body={page.body} />
      </Site>,
    );

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    await expectNoA11yViolations(container);
  });
});

describe("navigation and forms", () => {
  it("opens and closes the mobile menu with the keyboard", () => {
    render(<Header />);

    const button = screen.getByRole("button", { name: "Menu" });
    const menu = document.getElementById("mobile-menu");

    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(menu).toHaveAttribute("hidden");

    fireEvent.click(button);
    expect(screen.getByRole("button", { name: "Close" })).toHaveAttribute("aria-expanded", "true");
    expect(menu).not.toHaveAttribute("hidden");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "false");
    expect(menu).toHaveAttribute("hidden");
  });

  it("shows the project brief fields and stays closed without a bot-check key", async () => {
    const page = await loadPage("contact");
    const data = parsePageData(contactSchema, page);
    render(<ContactPage data={data} turnstileSiteKey="" />);

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText(/What is slowing you down/)).toBeInTheDocument();
    expect(screen.getByLabelText(/I agree/)).toBeInTheDocument();
    expect(screen.getByText(/not configured in this environment/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send project brief" })).toBeDisabled();
  });
});
