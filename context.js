let context = {
}
function defineProperty(target,property){
   Object.defineProperty(context,property,{
        get(){
            return this[target][property]
        },
        set(value){
            this[target][property]=value
        }
   })
}
defineProperty('request','url')
defineProperty('request','path')
defineProperty('request','query')
defineProperty('response','body')
module.exports =  context