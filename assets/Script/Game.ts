export namespace gi {
    export let log = CC_EDITOR ? cc.log : console.log;
    export let warn = CC_EDITOR ? cc.warn : console.warn;
    export let error = CC_EDITOR ? cc.error : console.error;
    export let resource = {};
    export function load(url: string): any {
        if (url.startsWith('Atlas')) {
            let index = url.lastIndexOf('/');
            let bundleName = url.substring(0, index);
            let resName = url.substring(index + 1);
            if (gi.resource[bundleName] !== undefined && gi.resource[bundleName].getSpriteFrame(resName) !== null) {
                return gi.resource[bundleName].getSpriteFrame(resName);
            }
        } else if (gi.resource[url] !== undefined) {
            return gi.resource[url];
        }
        gi.error(`gi.load读取缓存文件失败！(${url})`);
        return null;
    }
};
window['gi'] = gi;

const { ccclass, property } = cc._decorator;
@ccclass
export default class Game extends cc.Component {
    protected start() {
        cc.game.setFrameRate(60);
        cc.debug.setDisplayStats(false);
    }
}