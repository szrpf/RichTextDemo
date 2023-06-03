declare namespace gi {
    export let log = CC_EDITOR ? cc.log : console.log;
    export let warn = CC_EDITOR ? cc.warn : console.warn;
    export let error = CC_EDITOR ? cc.error : console.error;
    //资源缓存区，所有已加载的资源都会存在这里
    export let resource = {};
    //从resource里读取资源
    export function load(url: string): any;
}