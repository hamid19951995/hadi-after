(function(){
    function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
    function findComp(name){for(var i=1;i<=app.project.numItems;i++){var it=app.project.item(i);if(it.name===name&&it instanceof CompItem)return it;}return null;}
    function findLayer(comp,name){for(var i=1;i<=comp.numLayers;i++)if(comp.layer(i).name===name)return comp.layer(i);return null;}
    function ensurePropLayer(comp,prop){
        var name="PROP__"+prop.id, layer=findLayer(comp,name);
        if(!layer) layer=comp.layers.addShape();
        layer.name=name; return layer;
    }
    function setPosition(layer,pt,time){layer.transform.position.setValueAtTime(time,[pt.x||0,pt.y||0]);}
    function applyPropAction(comp,prop,action){
        var layer=ensurePropLayer(comp,prop), t=action.start;
        if(action.targetPosition) setPosition(layer,action.targetPosition,t);
        if(action.action==="attach"||action.action==="carry"||action.action==="handoff") layer.enabled=true;
        if(action.action==="drop") layer.enabled=true;
        if(action.action==="place") setPosition(layer,action.targetPosition||prop.position,t+action.duration);
        return {ok:true,layer:layer.name,action:action.action};
    }
    this.AEBOSS_ApplyCharacterPropPlan=function(plan,compName){
        if(!plan||plan.kind!=="character-prop-intelligence-plan.v1") throw new Error("INVALID_CHARACTER_PROP_PLAN");
        var comp=findComp(compName||plan.compositionName||"Character Scene");
        if(!comp) throw new Error("PROP_COMP_NOT_FOUND");
        var out=[]; for(var i=0;i<plan.props.length;i++) for(var j=0;j<plan.actions.length;j++) if(plan.actions[j].propId===plan.props[i].id) out.push(applyPropAction(comp,plan.props[i],plan.actions[j]));
        return JSON.stringify({ok:true,applied:out.length,results:out});
    };
})();
