import {
    Registry
} from 'monaco-textmate'
import {
    base
} from '@/config'
import {
    wireTmGrammars
} from 'monaco-editor-textmate'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import {
    loadWASM
} from "onigasm"
import { monacoEditorInnerLanguages, scopeNameMap, tmGrammarJsonMap } from '@/config/constants'

let hasGetAllWorkUrl = false

// 初始化编辑器
export const initMonacoEditor = async () => {
    // 加载onigasm的WebAssembly文件
    await loadWASM(`${base}/onigasm/onigasm.wasm`)
    // 配置编辑器运行环境
    window.MonacoEnvironment = {
        getWorkerUrl: function (moduleId, label) {
            hasGetAllWorkUrl = true
            if (label === 'json') {
                return './monaco/json.worker.bundle.js'
            }
            if (label === 'css' || label === 'scss' || label === 'less') {
                return './monaco/css.worker.bundle.js'
            }
            if (label === 'html' || label === 'handlebars' || label === 'razor') {
                return './monaco/html.worker.bundle.js'
            }
            if (label === 'typescript' || label === 'javascript') {
                return './monaco/ts.worker.bundle.js'
            }
            return './monaco/editor.worker.bundle.js'
        },
    }
}

/** 
 * javascript comment 
 * @Author: 王林25 
 * @Date: 2021-09-23 11:20:31 
 * @Desc: 创建语法关联 
 */
export const wire = async (languageId, editor) => {
    if (!scopeNameMap[languageId]) {
        return
    }
    // 语言id到作用域名称的映射
    const grammars = new Map()
    grammars.set(languageId, scopeNameMap[languageId])
    // 创建一个注册表，可以从作用域名称创建语法
    const registry = new Registry({
        getGrammarDefinition: async (scopeName) => {
            let jsonMap = tmGrammarJsonMap[scopeName]
            if (!jsonMap) {
                return null
            }
            let format = 'json'
            let path = jsonMap
            if (typeof jsonMap !== 'string') {
                format = jsonMap.format
                path = jsonMap.path
            }
            return {
                format,
                content: await (await fetch(`${base}grammars/${path}`)).text()
            }
        }
    })
    // 注册语言
    if (!monacoEditorInnerLanguages.includes(languageId)) {
        monaco.languages.register({id: languageId})
    }

    // fix：https://github.com/Microsoft/monaco-editor/issues/884
    let loop = () => {
        if (hasGetAllWorkUrl) {
            Promise.resolve().then(async () => {
                await wireTmGrammars(monaco, registry, grammars, editor)
            })
        } else {
            setTimeout(() => {
                loop()
            }, 100)
        }
    }
    loop()
}