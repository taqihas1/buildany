export async function generateMobileScreen(screenName: string, description: string) {
  return `// Auto-generated mobile screen: ${screenName}
// Description: ${description}
`;
}
