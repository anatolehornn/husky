import * as execa from 'execa'
import * as fs from 'fs'
import * as getStdin from 'get-stdin'
import * as path from 'path'
import * as readPkg from 'read-pkg'
import getConf from '../getConf'

export interface IEnv extends NodeJS.ProcessEnv {
  HUSKY_GIT_STDIN?: string
  HUSKY_GIT_PARAMS?: string
}

/**
 * @param argv - process.argv
 */
export default async function(
  [, scriptPath, hookName = '', HUSKY_GIT_PARAMS]: string[],
  getStdinFn = getStdin // Used for mocking
): Promise<number> {
  const cwd = path.resolve(scriptPath.split('node_modules')[0])
  //  const pkg = readPkg.sync(cwd)
  const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json')))

  const config = getConf(cwd)

  const command: string | undefined =
    config && config.hooks && config.hooks[hookName]

  const oldCommand: string | undefined =
    pkg && pkg.scripts && pkg.scripts[hookName.replace('-', '')]

  try {
    const env: IEnv = {}

    if (HUSKY_GIT_PARAMS) {
      env.HUSKY_GIT_PARAMS = GIT_PARAMS
    }

    if (
      ['pre-push', 'pre-receive', 'post-receive', 'post-rewrite'].includes(
        hookName
      )
    ) {
      env.HUSKY_GIT_STDIN = await getStdinFn()
    }

    if (command) {
      console.log(`husky > ${hookName} (node ${process.version})`)
      execa.shellSync(command, { cwd, env, stdio: 'inherit' })
      return 0
    }

    if (oldCommand) {
      console.log()
      console.log(
        `Warning: Setting ${hookName} script in package.json > scripts will be deprecated in v1.0`
      )
      console.log(
        `Please move it to husky.hooks in package.json, a .huskyrc file, or a husky.config.js file`
      )
      console.log(
        `Or run ./node_modules/.bin/husky-upgrade for automatic update`
      )
      console.log()
      console.log(`See https://github.com/typicode/husky for usage`)
      console.log()
      console.log(`husky > ${hookName} (node ${process.version})`)
      execa.shellSync(oldCommand, { cwd, env, stdio: 'inherit' })
      return 0
    }

    return 0
  } catch (err) {
    const noVerifyMessage =
      hookName === 'prepare-commit-msg'
        ? '(cannot be bypassed with --no-verify due to Git specs)'
        : '(add --no-verify to bypass)'

    console.log(`husky > ${hookName} hook failed ${noVerifyMessage}`)
    return err.code
  }
}
