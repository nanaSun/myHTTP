let myhttp=require("./application")
let Router=require("./router")
let view=require("./Views")
let bodyparser=require("./bodyparser")
//读取文件

let app= new myhttp()
let router=new Router()
//先处理获取数据的
app.use(bodyparser())
router.get("/",view("/pages/template.ejs",{}))
router.post("/submit",async (ctx,next)=>{
    await next()
})

app.use(router.routers())
app.listen(3000)