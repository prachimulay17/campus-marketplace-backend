import brevo from "@getbrevo/brevo";
console.log("BREVO KEY LOADED:", !!process.env.BREVO_API_KEY);

const apiInstance = new brevo.TransactionalEmailsApi();

apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

export default apiInstance;
