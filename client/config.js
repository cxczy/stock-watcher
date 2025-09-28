export default import.meta.PROD
  ? {
      tokenName: "dev_admin_token",
    }
  : {
      tokenName: "admin_token",
    }
