let myhttp=require("./application")
let Router=require("./router")
let app= new myhttp()

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

let router=new Router()
router.use("/admin",admin.routers())
.use("/user",user.routers())


app.use(router.routers())

app.listen(3000)