const colors = [
  "#F8D99E",
  "#CDE2D4",
  "#F4C5B8",
  "#F9E6A3",
  "#E5CBEA",
  "#C7DCE7",
];

export function categoryColor(index: number): string {
  return colors[index % colors.length];
}

export function categoryLetter(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "R";
}
