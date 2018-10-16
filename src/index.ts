
      /*#######.
     ########",#:
   #########',##".
  ##'##'## .##',##.
   ## ## ## # ##",#.
    ## ## ## ## ##'
     ## ## ## :##
      ## ## ##*/

import { Types, BabelPlugin } from './types'
import { NodePath } from 'babel-traverse'
import { Expression, CallExpression, MemberExpression } from 'babel-types'

const getAccessorChainFromFunction = (types: Types, expr: MemberExpression) => {
  const chain: Expression[] =
    expr.object.type === 'MemberExpression'
      ? getAccessorChainFromFunction(types, expr.object)
      : []

  if (types.isIdentifier(expr.property)) {
    chain.push(
      expr.computed === true
        ? expr.property
        : types.stringLiteral(expr.property.name)
    )
  } else if (types.isLiteral(expr.property)) {
    chain.push(expr.property)
  }

  return chain
}

const isImportedFromMonolite = (path: NodePath<CallExpression>): boolean => {
  if (path.node.callee.type !== 'Identifier') {
    return false
  }

  if (path.node.callee.name !== 'set') {
    return false
  }

  // Check set is imported from a module
  const setDeclaration = path.scope.getBinding('set')

  // set is a global variable
  if (setDeclaration === undefined) {
    return false
  }

  // set is not imported from a module
  if (setDeclaration.kind !== 'module') {
    return false
  }

  return true
}

const monolitePlugin: BabelPlugin = ({ types }) => ({
  visitor: {
    CallExpression(path) {
      if (!isImportedFromMonolite(path)) {
        return
      }

      const [, accessorFunction, valueTransformer] = path.node.arguments

      if (
        typeof accessorFunction === 'undefined' ||
        typeof valueTransformer === 'undefined'
      ) {
        return
      }

      if (
        accessorFunction.type !== 'ArrowFunctionExpression' ||
        accessorFunction.params.length !== 1 ||
        accessorFunction.type !== 'ArrowFunctionExpression' ||
        accessorFunction.body.type !== 'MemberExpression'
      ) {
        return
      }

      path.replaceWith(
        types.callExpression(path.node.callee, [
          path.node.arguments[0],
          types.arrayExpression(
            getAccessorChainFromFunction(types, accessorFunction.body)
          ),
          valueTransformer
        ])
      )
    }
  }
})

export default monolitePlugin
