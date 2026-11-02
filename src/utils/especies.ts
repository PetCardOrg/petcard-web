/** Cores do avatar e da etiqueta de cada espécie; `OTHER` para as demais. */
const SPECIES_COLORS: Record<string, { bg: string; text: string }> = {
  DOG: { bg: "#e6f7fc", text: "#27a9d8" },
  CAT: { bg: "#ede5fc", text: "#6b48c8" },
  BIRD: { bg: "#e5f8ee", text: "#06a77d" },
  OTHER: { bg: "#fef5e6", text: "#d4940a" },
};

export function coresDaEspecie(species: string | undefined): {
  bg: string;
  text: string;
} {
  return SPECIES_COLORS[species ?? ""] ?? SPECIES_COLORS.OTHER;
}
