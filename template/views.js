const fs=require("fs")
const path=require("path")
const util=require("util")
const readFile=util.promisify(fs.readFile)
function view(p,data){
    let tpl="";
    let allTags=[];
    function getTags(){
        let operators = tpl.match(/<%(?!=)([\s\S]*?)%>([\s\S]*?)<%(?!=)([\s\S]*?)%>/ig)||[]
        operators.forEach((element,index )=> {
            tpl=tpl.replace(element,`<!--operator ${index}-->`)
        });
        let tags=tpl.match(/<%=([\s\S]*?)%>/ig)||[]
        tags.forEach((element,index) => {
            tpl=tpl.replace(element,`<!--operator ${index+operators.length}-->`)
        });
        allTags=[...operators,...tags];
    }
    function render(){
        getTags();
        allTags=allTags.map((e,i)=>{
            let str = `let tmpl=''\r\n`;
            str +=  'tmpl+=`\r\n';
            str += e
            str = str.replace(/<%=([\s\S]*?)%>/ig,function () {
                return '${'+arguments[1]+'}'
            })
            str = str.replace(/<%([\s\S]*?)%>/ig,function () {
                return '`\r\n'+arguments[1] +"\r\ntmpl+=`"
            })
            str += '`\r\n return tmpl';

            let keys=Object.keys(data);
            let fnStr = new Function(...keys,str);
            return fnStr(...keys.map((k)=>data[k]));
        })
        allTags.forEach((element,index )=> {
           tpl=tpl.replace(`<!--operator ${index}-->`,element)
        });
    }
    return async (ctx,next)=>{
        tpl = await readFile(path.join(__dirname,p),"utf-8")
        render();
        ctx.body=tpl;
        await next();
    }
}
module.exports=view