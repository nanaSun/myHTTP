let myhttp=require("./application")
let Router=require("./router")
let view=require("./Views")
let bodyparser=require("./bodyparser")
//读取文件
function setTime(value,id){
    return new Promise((r,j)=>setTimeout(() => {
        console.log("setTimtout"+value+id)
        r(id)
    }, 10))
}
let app= new myhttp()
let router=new Router()
//先处理获取数据的
app.use(bodyparser())
router.get("/",view("/pages/template.ejs",{}))
router.post("/submit",async (ctx,next)=>{
    await next()
})

app.use(router.routes())
app.listen(3000)