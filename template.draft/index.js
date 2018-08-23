let myHttp=require("../myHTTP/myHTTP/application");
let views=require("../myHTTP/myHTTP/ejs")
let fs = require('fs');
let path=require("path")
let template=fs.readFileSync(path.join(__dirname,"template.ejs"),"utf-8")
function getTags(tpl){
    //let tags = tpl.match(//ig)
    let operators = tpl.match(/<%(?!=)([\s\S]*?)%>([\s\S]*?)<%(?!=)([\s\S]*?)%>/ig)
    operators.forEach((element,index )=> {
        tpl=tpl.replace(element,`<!--operator ${index}-->`)
    });
    let tags=tpl.match(/<%=([\s\S]*?)%>/ig)
    tags.forEach((element,index) => {
        tpl=tpl.replace(element,`<!--tag ${index}-->`)
    });
    return {
        operators:operators,
        tags:tags,
        tpl:tpl
    }
}
let strings=getTags(template);
strings.operators.map((e,i)=>{
    let str = `let tmpl=''\r\n`;
    str += `with (data) {\r\n`;
    str +=  'tmpl+=`\r\n';
    str += e
    str = str.replace(/<%=([\s\S]*?)%>/ig,function () {
    return '${'+arguments[1]+'}'
    })
    str = str.replace(/<%([\s\S]*?)%>/ig,function () {
        return '`\r\n'+arguments[1] +"\r\ntmpl+=`"
    })
    str += '`}\r\n return tmpl';
    let fnStr = new Function("data",str);
    let result = fnStr( { data: {user:[1, 2, 3]} });
})

// let app=new myHttp();
// app.use(ctx=>{
//     ctx.body=template
//     console.log(ctx.response.body)
// })
// app.listen(3000)