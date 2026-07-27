# Synthetic CV evaluation fixtures

All files in this directory are generated, fictional CVs. They contain no real
candidate data. Regenerate the binary fixtures after changing their source
content with:

```bash
pnpm --filter @hr-copilot/api eval:cv:fixtures
```

`expected.json` is reviewed by hand and drives the manual evaluation harness.
Do not replace these fixtures with production CVs.
