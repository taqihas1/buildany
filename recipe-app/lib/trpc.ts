// Stub tRPC client for build compatibility
// The import recipe feature would need a backend server to work fully

export const trpc = {
  recipe: {
    importFromUrl: {
      useMutation: () => ({
        mutateAsync: async () => {
          throw new Error('Import feature requires backend setup');
        },
        isPending: false,
      }),
    },
  },
};
