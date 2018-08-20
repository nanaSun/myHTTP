let context = {
}
function defineProperty(target,property){
   Object.defineProperty(context,property,{
        get(){
            return this[target][property]
        }
   })
}
defineProperty('request','url')
defineProperty('request','path')

defineProperty('request','query')
module.exports =  context