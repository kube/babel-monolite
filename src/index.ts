
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
import {
  Expression,
  CallExpression,
  MemberExpression,
  ArrowFunctionExpression,
  Identifier
} from 'babel-types'
import { types } from 'babel-core'

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

const transformClassicalSet = (
  types: Types,
  path: NodePath<CallExpression>
) => {
  const [rootObject, accessorFunction, valueTransformer] = path.node.arguments

  if (
    accessorFunction.type !== 'ArrowFunctionExpression' ||
    accessorFunction.params.length !== 1 ||
    accessorFunction.type !== 'ArrowFunctionExpression' ||
    accessorFunction.body.type !== 'MemberExpression'
  ) {
    return
  }

  checkAccessorFunction(path.get('arguments.1') as NodePath<
    ArrowFunctionExpression
  >)

  path.replaceWith(
    types.callExpression(path.node.callee, [
      rootObject,
      types.arrayExpression(
        getAccessorChainFromFunction(types, accessorFunction.body)
      ),
      valueTransformer
    ])
  )
}

const checkAccessorFunction = (
  accessorFunctionPath: NodePath<ArrowFunctionExpression>
) => {
  const params = accessorFunctionPath.node.params
  const rootParam: Identifier = params[0] as any

  if (params.length !== 1) {
    throw accessorFunctionPath.buildCodeFrameError(
      'Monolite: Accessor should take exactly one root argument.'
    )
  }

  if (rootParam.type !== 'Identifier') {
    throw accessorFunctionPath.buildCodeFrameError(
      'Monolite: Invalid accessor root argument.'
    )
  }

  const rootName = rootParam.name
  let currentBodyPath = accessorFunctionPath.get('body')

  while (currentBodyPath) {
    if (types.isMemberExpression(currentBodyPath.node)) {
      currentBodyPath = currentBodyPath.get('object')
    } else if (types.isIdentifier(currentBodyPath.node)) {
      if (currentBodyPath.node.name !== rootName) {
        throw currentBodyPath.buildCodeFrameError(
          'Monolite: Accessor function should return a subproperty of root'
        )
      }
      break
    } else {
      throw currentBodyPath.buildCodeFrameError(
        'Monolite: Accessor function should return a subproperty of root'
      )
    }
  }
}

const transformFluentSetRecursively = (
  types: Types,
  path: NodePath<CallExpression>
) => {
  if (path.parentPath.type === 'MemberExpression') {
    const memberExprPath = path.parentPath as NodePath<MemberExpression>
    const callExprPath = memberExprPath.parentPath as NodePath<CallExpression>

    if (
      memberExprPath.node.property &&
      memberExprPath.node.property.type === 'Identifier' &&
      memberExprPath.node.property.name === 'set' &&
      callExprPath &&
      callExprPath.type === 'CallExpression'
    ) {
      const [accessorFunction, valueTransformer] = callExprPath.node.arguments

      if (
        accessorFunction &&
        accessorFunction.type === 'ArrowFunctionExpression' &&
        accessorFunction.body.type === 'MemberExpression'
      ) {
        checkAccessorFunction(callExprPath.get('arguments.0') as NodePath<
          ArrowFunctionExpression
        >)

        callExprPath.replaceWith(
          types.callExpression(callExprPath.node.callee, [
            types.arrayExpression(
              getAccessorChainFromFunction(types, accessorFunction.body)
            ),
            valueTransformer
          ])
        )
      }

      // Replace methods recursively in parents
      transformFluentSetRecursively(types, callExprPath)
    }
  }
}

const monolitePlugin: BabelPlugin = ({ types }) => ({
  visitor: {
    CallExpression(path) {
      if (!isImportedFromMonolite(path)) {
        return
      }

      const [, accessorFunction] = path.node.arguments

      if (typeof accessorFunction === 'undefined') {
        // If no accessorFunction was passed, set is used in fluent style:
        // e.g. set(state).set(_ => _.prop, value)
        transformFluentSetRecursively(types, path)
      } else {
        // Else classical three arguments:
        // e.g. set(state, _ => _.prop, value)
        transformClassicalSet(types, path)
      }
    }
  }
})

export default monolitePlugin
