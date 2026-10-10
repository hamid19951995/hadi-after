"use strict";
const families={
 "character-explainer":{roles:["character","prop","background","caption"],actions:["idle","walk","talk","point","wave","think","celebrate","present"]},
 "architectural-landmark":{roles:["sky","landmark","foreground","title"],actions:["assemble","parallax","camera-push","line-reveal"]},
 "infographic-chart":{roles:["chart","labels","background","callout"],actions:["bar-grow","count-up","stagger","highlight"]},
 "product-promo":{roles:["product","background","accent","headline"],actions:["scale-in","slide","rotate","glow-pulse"]},
 "corporate-story":{roles:["character","prop","background","headline"],actions:["stagger","slide","fade","parallax"]},
 "logo-reveal":{roles:["logo","particles","background","title"],actions:["mask-reveal","scale","rotate","particle-burst"]}
};
const styles={flat:{palette:["#7DA6B8","#F0D6BA","#586F70","#8A8AA5"],motion:"smooth"},cinematic:{palette:["#111827","#274156","#B7791F","#E5E7EB"],motion:"eased"},minimal:{palette:["#F8FAFC","#0F172A","#38BDF8","#94A3B8"],motion:"precise"},modern:{palette:["#0EA5E9","#8B5CF6","#F97316","#F8FAFC"],motion:"dynamic"},corporate:{palette:["#0F4C81","#4C78A8","#E8EEF4","#FFFFFF"],motion:"controlled"}};
function capabilities(family){return families[family]||families["product-promo"]}
module.exports={families,styles,capabilities};
