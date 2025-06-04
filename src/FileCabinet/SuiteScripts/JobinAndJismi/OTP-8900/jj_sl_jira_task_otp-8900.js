/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
/*************************************************************************************
 ***********
 *
 *
 * ${OTP-8900} : ${External Custom Record form and actions}
 *
 *
 **************************************************************************************
 ********
 *
 * Author: Jobin and Jismi IT Services
 *
 * Date Created : 02-June-2025
 *
 * Description : This script is for creating records of a custom record type in NetSuite with the fields customer name , email,
 * customer reference, subjecgt and message.The customer reference field will contain a link to the customer record of any
 * existing matching customer,, with the same email address entered in the form.
 *
 *
 * REVISION HISTORY
 *
 * @version 1.0  :  02-June-2025:  The initial build was created by JJ0401
 *
 *
 *
 *************************************************************************************
 **********/
define(["N/email","N/log", "N/record", "N/search", "N/ui/serverWidget", "N/url"], /**
 * @param{email} email
 * @param{log} log
 * @param{record} record
 * @param{search} search
 * @param{serverWidget} serverWidget
 * @param{url} url
 */ (email, log, record, search, serverWidget, url) => {
  /**
   * Defines the Suitelet script trigger point.
   * @param {Object} scriptContext
   * @param {ServerRequest} scriptContext.request - Incoming request
   * @param {ServerResponse} scriptContext.response - Suitelet response
   * @since 2015.2
   */
  const onRequest = (scriptContext) => {
    try {
      if (scriptContext.request.method === "GET") {
        
        formCreation(scriptContext);
      }
      if (scriptContext.request.method === "POST") {
        var custName = scriptContext.request.parameters.custpage_cust_ref_name;
        var custEmail =
          scriptContext.request.parameters.custpage_cust_ref_email;

        var custSubject =
          scriptContext.request.parameters.custpage_cust_ref_subject;
        var custMessage =
          scriptContext.request.parameters.custpage_cust_ref_message;

        var customerSearch1 = emailSearch(custEmail,scriptContext);

        var customerId;

        customerSearch1.run().each(function (result) {
          customerId = result.getValue({ name: "internalid" });
        });

        var refLink = url.resolveRecord({
          recordType: "customer",
          recordId: customerId,
          isEditMode: true,
        });

        var customerRecord = record.load({
          type:record.Type.CUSTOMER,
          id:customerId,
          isDynamic:true,
        });

        var salesRep = customerRecord.getValue({fieldId:'salesrep'});
        

        recordCreation(custName,custEmail,refLink,custSubject,custMessage,salesRep);
      }
    } catch (e) {
      log.debug("Error caught", e.message);
    }
  };
  /**
   * Function to create a form
   * @param scriptContext
   * @returns {void}
   */

  function formCreation(scriptContext) {
    
    var form = serverWidget.createForm({
      title: "Customer Form",
    });

    var nameField = form.addField({
      id: "custpage_cust_ref_name",
      type: serverWidget.FieldType.TEXT,
      label: "Customer Name",
    });

    var emailField = form.addField({
      id: "custpage_cust_ref_email",
      type: serverWidget.FieldType.EMAIL,
      label: "Customer Email",
    });

    var subjectField = form.addField({
      id: "custpage_cust_ref_subject",
      type: serverWidget.FieldType.TEXT,
      label: "Subject",
    });

    var messageField = form.addField({
      id: "custpage_cust_ref_message",
      type: serverWidget.FieldType.TEXT,
      label: "Message",
    });

    form.addSubmitButton({
      label: "Submit",
    });

    scriptContext.response.writePage({
      pageObject: form,
    });
  }

  
  /**
   * Function to create a search
   * @param {string} email : the email which was entered in the form
   * @param  scriptContext
   * @returns {search object}
   */
  function emailSearch(email,scriptContext) {
    var customerSearch = search.create({
      title: "Email Duplicate Search JJ",
      id: "customsearch_jj_email_duplicate",
      type: search.Type.CUSTOMER,
      filters: [["email", "is", email]],
      columns: [
        search.createColumn({ name: "entityid", label: "Name" }),
        search.createColumn({ name: "internalid", label: "Internal ID" }),
      ],
    });

    return customerSearch;
  }

  /**
   * Function to create a custom record
   * @param {string} name - name of the customer
   * @param {string} email - email address of the customer
   * @param {url} link - link to the existing customer record
   * @param {string} sub - subject of the message
   * @param {string} msg - the message content
   * @param {int} saleRep - internal id of the customer's sales rep
   * @returns {void}
   */

  function recordCreation(name,email,link,sub,msg,saleRep) {
    
    //Record creation
    var customerRecord = record.create({
      type: "customrecord_jj_customer_reference",
      ignoreFieldChange: true,
      isDynamic: true,
    });
    
    //Setting values
    customerRecord.setValue({
      fieldId: "custrecord_jj_cust_ref_name",
      value: name,
    });
    customerRecord.setValue({
      fieldId: "custrecord_jj_cust_ref_email",
      value: email,
    });
    customerRecord.setValue({
      fieldId: "custrecord_jj_cust_ref_subject",
      value: sub,
    });
    customerRecord.setValue({
      fieldId: "custrecord_jj_cust_reference",
      value: link,
    });

    customerRecord.setValue({
      fieldId: "custrecord_jj_cust_ref_message",
      value: msg,
    });

    var recId = customerRecord.save();

    if(recId){
      sendAdminEmail();
    }

    if(saleRep){
      sendRepEmail(saleRep);
    }
  }
  
  /**
   * Function to send email notification to the NetSuite admin
   * @param {}
   * @returns {void}
   */
  function sendAdminEmail(){

    email.send({
      author:-5,
      recipients:['logan.whitaker@zentorque.com'],
      subject:"Custom Record Creation",
      body:"A custom customer record was created",
    });

  }

  /**
   * Function to send email notification to the customer's sales rep, if any
   * @param {int} salesRepresentative - internal id of the sales rep
   * @returns {void}
   */
  function sendRepEmail(salesRepresentative)
  {
    var salesRepRecord = record.load({
      type:record.Type.EMPLOYEE,
      id:salesRepresentative,
      isDynamic:true,
    });

    var salesRepEmail = salesRepRecord.getValue({fieldId:'email'});

    email.send({
      author:-5,
      recipients:[salesRepEmail],
      subject:"Custom record creation",
      body:"A custom customer record was created"
    });
  }

  return { onRequest };
});
