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
define(["N/log", "N/record", "N/search", "N/ui/serverWidget", "N/url"], /**
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
        formCreation();
      }
      if (scriptContext.request.method === "POST") {
        var custName = scriptContext.request.parameters.custpage_cust_ref_name;
        var custEmail =
          scriptContext.request.parameters.custpage_cust_ref_email;

        var custSubject =
          scriptContext.request.parameters.custpage_cust_ref_subject;
        var custMessage =
          scriptContext.request.parameters.custpage_cust_ref_message;

        var customerSearch1 = emailSearch(custEmail);

        var customerId;

        customerSearch1.run().each(function (result) {
          customerId = result.getValue({ name: "internalid" });
        });

        var refLink = url.resolveRecord({
          recordType: "customer",
          recordId: customerId,
          isEditMode: true,
        });

        recordCreation();
      }
    } catch (e) {
      log.debug("Error caught", e.message);
    }
  };
  /**
   * Function to create a form
   * @param
   * @returns {void}
   */

  function formCreation() {
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

  //Searching for existing customers with the entered email
  /**
   * Function to create a saved search
   * @param {string} email : the email which was entered in the form
   * @returns {search object}
   */
  function emailSearch(email) {
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
   * @param {}
   * @returns {void}
   */

  function recordCreation() {
    //Record creation
    var customerRecord = record.create({
      type: "customrecord_jj_customer_reference",
      ignoreFieldChange: true,
      isDynamic: true,
    });

    //Setting values
    customerRecord.setValue({
      fieldId: "custrecord_jj_cust_ref_name",
      value: custName,
    });
    customerRecord.setValue({
      fieldId: "custrecord_jj_cust_ref_email",
      value: custEmail,
    });
    customerRecord.setValue({
      fieldId: "custrecord_jj_cust_ref_subject",
      value: custSubject,
    });
    customerRecord.setValue({
      fieldId: "custrecord_jj_cust_reference",
      value: refLink,
    });

    customerRecord.setValue({
      fieldId: "custrecord_jj_cust_ref_message",
      value: custMessage,
    });

    customerRecord.save();
  }

  return { onRequest };
});
