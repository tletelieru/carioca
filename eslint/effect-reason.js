const DIRECTIVE = /^\s*eslint-disable(?:-next-line|-line)?\s+(.*)$/s
const MIN_REASON = 10

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require a written reason when disabling local/no-effect',
    },
    schema: [],
    messages: {
      reason: 'Disabling local/no-effect needs a reason after `--` (at least {{min}} characters).',
    },
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          const match = DIRECTIVE.exec(comment.value)
          if (!match) continue
          const [rules, reason = ''] = match[1].split(/\s--\s?/)
          if (!rules.includes('local/no-effect')) continue
          if (reason.trim().length >= MIN_REASON) continue
          context.report({ loc: comment.loc, messageId: 'reason', data: { min: MIN_REASON } })
        }
      },
    }
  },
}
