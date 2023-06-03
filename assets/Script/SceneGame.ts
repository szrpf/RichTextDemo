import RichText from "./RichText";

const {ccclass, property} = cc._decorator;

@ccclass
export default class SceneGame extends cc.Component {
    richText:RichText = null;
    start () {
        this.richText = cc.find('富文本',this.node).getComponent(RichText);
        // this.richText.string = '\\p爆炸\\p你好';
    }

}