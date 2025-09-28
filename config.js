export default process.env.NODE_ENV === "production"
  ? {
      appSecret: "xxx",
      adminName: "authUser",
      adminPassword: "123443211234",
    }
  : {
      appSecret: "xxx",
      adminName: "admin",
      adminPassword: "1234",
    }
