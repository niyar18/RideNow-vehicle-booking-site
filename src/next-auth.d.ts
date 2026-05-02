declare module "next-auth" {
    interface User {
        id:string,
        name:string,
        email:string,
        role:string
    }
}
export {}