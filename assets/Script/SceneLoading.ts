const {ccclass, property} = cc._decorator;

@ccclass
export default class SceneLoading extends cc.Component {
    progress:number = 0;
    start () {
        cc.assetManager.loadBundle('Resource', (err, bundle) => {
            let files = bundle.getDirWithPath('');
            let cur = 0;
            for (let i = 0, total = files.length; i < total; ++i) {
                let name = files[i].path;
                let bundleName = name.substring(0, name.indexOf('/'));
                let type: any = cc.Prefab;
                switch (bundleName) {
                    case 'Atlas': type = cc.SpriteAtlas; break;
                    case 'Audio': type = cc.AudioClip; break;
                    case 'Image': type = cc.SpriteFrame; break;
                    case 'Spine': type = sp.SkeletonData; break;
                    case '': type = cc.Prefab; break;
                    default: ++cur; continue;
                }
                bundle.load(name, type, (err, prefab) => {
                    if (err === undefined) {
                        gi.resource[name] = prefab;
                    } else {
                        gi.error(`文件加载失败！(${name})`);
                    }
                    this.progress = 100 * ++cur / total;
                    if (cur === total) {
                        cc.director.loadScene('SceneGame');
                    }
                });
            }
        });
    }

}