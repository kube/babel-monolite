import * as babel from 'babel-core'
import * as types from 'babel-types'
import { Visitor } from 'babel-core'

declare type Babel = typeof babel

declare type Types = typeof types

declare type BabelPlugin = (babel: Babel) => ({
  visitor: Visitor
})
