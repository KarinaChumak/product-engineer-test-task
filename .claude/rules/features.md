---
paths:
  - 'src/app/**'
---

- Compose components from `src/components/`. No HTML elements, CSS or `className` here; ESLint and `src/test/conventions.test.ts` enforce it. A missing look is a new prop or component in `src/components/`.
- Request functions live in `src/app/api.ts`. Each query has a `use<Thing>` hook in `src/app` that returns the `useQuery` result unchanged, as `useJobs` does:

  ```ts
  export function useJobs() {
    return useQuery({ queryKey: ['jobs'], queryFn: ({ signal }) => fetchJobs(signal) });
  }
  ```

- A fetch function throws on a non-2xx response, with an error class the UI can tell apart (`NotFoundError`), so components branch on `query.error`, not on a status of their own.
- Every query has its loading, error and empty states on screen, each with a test.
