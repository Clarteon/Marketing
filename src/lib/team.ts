export interface TeamMember {
  id: string;
  name: string;
  role: string;
  tier: 1 | 2 | 3;
  monogram: string;
  department: string;
  reportsTo: string | null;
  photoUrl?: string | null;
}

export const DEFAULT_TEAM_MEMBERS: TeamMember[] = [
  {
    id: "hsisan-angel-romero",
    name: "Hsisan Angel Romero",
    role: "Chief Executive Officer (CEO)",
    tier: 1,
    monogram: "HR",
    department: "Executive Direction",
    reportsTo: null,
    photoUrl: null,
  },
  {
    id: "aldrei-justin-santua",
    name: "Aldrei Justin S. Santua",
    role: "Chief Technology Officer (CTO)",
    tier: 2,
    monogram: "AS",
    department: "Architecture & Engineering",
    reportsTo: "hsisan-angel-romero",
    photoUrl: null,
  },
  {
    id: "michelle-eunice-opena",
    name: "Michelle Eunice H. Opeña",
    role: "Product & Delivery Lead",
    tier: 2,
    monogram: "MO",
    department: "Product & Client Delivery",
    reportsTo: "hsisan-angel-romero",
    photoUrl: null,
  },
  {
    id: "jossel-john-dumaop",
    name: "Jossel John S. Dumaop",
    role: "AI Engineer & Automation Specialist",
    tier: 3,
    monogram: "JD",
    department: "AI & Workflow Systems",
    reportsTo: "aldrei-justin-santua",
    photoUrl: null,
  },
  {
    id: "brandon-abuya",
    name: "Brandon J. Abuya",
    role: "Full-Stack Developer & Software Engineer",
    tier: 3,
    monogram: "BA",
    department: "Web & Platform Engineering",
    reportsTo: "aldrei-justin-santua",
    photoUrl: null,
  },
];

export function resolveTeamMembers(
  photoOverrides?: Record<string, string | null | undefined>,
): TeamMember[] {
  if (!photoOverrides) return DEFAULT_TEAM_MEMBERS;
  return DEFAULT_TEAM_MEMBERS.map((member) => {
    const customUrl = photoOverrides[member.id]?.trim();
    return {
      ...member,
      photoUrl: customUrl ? customUrl : member.photoUrl,
    };
  });
}

export function getAuthorMember(
  authorName: string | undefined,
  team: readonly TeamMember[] = DEFAULT_TEAM_MEMBERS,
): TeamMember | null {
  const normalized = authorName?.trim().toLowerCase();
  if (!normalized) return null;
  return team.find((member) => member.name.trim().toLowerCase() === normalized) ?? null;
}
