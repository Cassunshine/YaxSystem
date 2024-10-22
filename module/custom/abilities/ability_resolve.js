const item = scope._templateSystem.entity;

await game.macros.getName("ability_undeclare").execute(item);

console.log(item);


let content = "<p>Resolve ability <b>@UUID[" + item.uuid + "]</b></p>";

if (item.parent.inCombat) {
  await item.update({ ['system.props.cooldown']: item.system.props.useTime });

  if (item.system.props.encounterDescription)
    content += "</br>" + item.system.props.encounterDescription;
} else {
  if (item.system.props.downtimeDescription)
    content += "</br>" + item.system.props.downtimeDescription;
}

const chatData = {
  user: game.user._id,
  speaker: {
    actor: item.parent._id,
    alias: item.parent.name,
  },
  content: content,
};

ChatMessage.create(chatData, {});