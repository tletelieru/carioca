const IGNORED = new Set(['key', 'data-testid'])

function tagName(node) {
  const name = node.openingElement.name
  if (name.type === 'JSXIdentifier') return name.name
  if (name.type === 'JSXMemberExpression') return `${tagName({ openingElement: { name: name.object } })}.${name.property.name}`
  return null
}

function attributes(node, source) {
  const result = new Map()
  for (const attribute of node.openingElement.attributes) {
    if (attribute.type !== 'JSXAttribute') continue
    const name = attribute.name.name
    if (typeof name !== 'string' || IGNORED.has(name) || name.startsWith('aria-')) continue
    result.set(name, attribute.value ? source.getText(attribute.value) : 'true')
  }
  return result
}

function isBlank(child) {
  return child.type === 'JSXText' && child.value.trim() === ''
}

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow consecutive sibling JSX elements that repeat the same props',
    },
    schema: [
      {
        type: 'object',
        properties: {
          minShared: { type: 'integer', minimum: 1 },
          requireSame: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      repeated:
        '<{{tag}}> repeats {{props}} from the previous sibling. Map over a list or extract a component.',
    },
  },
  create(context) {
    const options = context.options[0] ?? {}
    const minShared = options.minShared ?? 1
    const requireSame = options.requireSame ?? ['className']
    const source = context.sourceCode

    function check(children) {
      let previous = null
      for (const child of children) {
        if (isBlank(child)) continue
        if (child.type !== 'JSXElement') {
          previous = null
          continue
        }
        const current = { tag: tagName(child), props: attributes(child, source) }
        if (previous && current.tag && current.tag === previous.tag) {
          const shared = [...current.props].filter(([name, value]) => previous.props.get(name) === value)
          const sharedNames = new Set(shared.map(([name]) => name))
          const required = requireSame.every(
            (name) => !current.props.has(name) || sharedNames.has(name),
          )
          if (shared.length >= minShared && required) {
            context.report({
              node: child.openingElement,
              messageId: 'repeated',
              data: { tag: current.tag, props: shared.map(([name]) => name).join(', ') },
            })
          }
        }
        previous = current
      }
    }

    return {
      JSXElement: (node) => check(node.children),
      JSXFragment: (node) => check(node.children),
    }
  },
}
