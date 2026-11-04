const EFFECTS = new Set(['useEffect', 'useLayoutEffect', 'useInsertionEffect'])

function calleeName(callee) {
  if (callee.type === 'Identifier') return callee.name
  if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') return callee.property.name
  return null
}

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require every effect to be justified with an eslint-disable comment and a reason',
    },
    schema: [],
    messages: {
      effect:
        '{{name}} needs a reason. Prefer an event handler or derived value; if it syncs an external system, add `// eslint-disable-next-line local/no-effect -- <why>`.',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const name = calleeName(node.callee)
        if (name && EFFECTS.has(name)) context.report({ node, messageId: 'effect', data: { name } })
      },
    }
  },
}
