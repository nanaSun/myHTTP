let myhttp=require("./application")
let Router=require("./router")
let view=require("./Views")
//读取文件


let app= new myhttp()
let router=new Router()
router.get("/",async (ctx,next)=>{
    let render= view("path",{ 
        test: "hello world",
        users:[1, 2, 3]
    })
    ctx.body=await render();
})

let admin=new Router()
admin.get("/",(ctx,next)=>{
    ctx.body="admin"
    next()
})
.get("/login",(ctx,next)=>{
    ctx.body="admin/login"
    next()
})
.get("/register",(ctx,next)=>{
    ctx.body="admin/register"
    next()
})

let user=new Router()
user.get("/",(ctx,next)=>{
    ctx.body="user"
    next()
})
.get("/login",(ctx,next)=>{
    ctx.body="user/login"
    next()
})
.get("/register",(ctx,next)=>{
    ctx.body="user/register"
    next()
})


router
.use("/admin",admin.routers())
.use("/user",user.routers())

app.use(router.routers())

app.listen(3000)