/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
/*************************************************************************************
 *
 *
 * ${OTP-8900} : ${External Custom Record form and actions}
 *
 *
 **************************************************************************************
 *
 * Author: Jobin and Jismi IT Services
 *
 * Date Created : 02-June-2025
 *
 * Description : This script is for creating records of a custom record type in NetSuite
 * with the fields customer name , email,customer reference, subjecgt and message.The
 * customer reference field will contain a link to the customer record of any existing
 * matching customer,, with the same email address entered in the form.
 *
 *
 * REVISION HISTORY
 *
 * @version 1.0  :  02-June-2025: The initial build was created by JJ0401
 * @version 1.1  :  11-June-2025: Formatted the header section, set ignoreMandatoryField
 *                                to true, changed the log level from debug to error,added
 *                                try-catch error handling to all custom functions and the
 *                                code was optimized
 *
 *
 *************************************************************************************/
define([
  "N/email",
  "N/log",
  "N/record",
  "N/search",
  "N/ui/serverWidget",
  "N/url",
], /**
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
        recordCreation(scriptContext);
      }
    } catch (e) {
      log.error("Error caught", e.message);
    }
  };

  /**
   * Function to create a form
   * @param scriptContext
   * @returns {void}
   */

  function formCreation(scriptContext) {
    try {
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
    } catch (e) {
      log.error("Error caught", e.message);
    }
  }

  /**
   * Function to create a custom record
   * @param {Object} scriptContext
   * @returns {void}
   */

  function recordCreation(scriptContext) {
    try {
      //Record creation
      let custName = scriptContext.request.parameters.custpage_cust_ref_name;
      let custEmail = scriptContext.request.parameters.custpage_cust_ref_email;
      let custSubject =
        scriptContext.request.parameters.custpage_cust_ref_subject;
      let custMessage =
        scriptContext.request.parameters.custpage_cust_ref_message;

      let customerSearch1 = emailSearch(custEmail);

      let customerId;

      let doesExist = duplicateSearch(custName, custEmail);

      if (doesExist) {
        let form = serverWidget.createForm({
          title: "Custom Record Creation !",
        });

        let resultField = (form.addField({
          id: "custpage_existing",
          type: serverWidget.FieldType.INLINEHTML,
          label: "Text",
        }).defaultValue = `
            
            <p> A customer with the same details exists ! </p>`);

        scriptContext.response.writePage({
          pageObject: form,
        });
      } else {
        customerSearch1.run().each(function (result) {
          customerId = result.getValue({ name: "internalId" });
        });

        let saleRep = search.lookupFields({
          type: search.Type.CUSTOMER,
          id: customerId,
          columns: ["salesrep"],
        });

        let salesRepId = saleRep.salesrep[0].value;

        var customerRecord = record.create({
          type: "customrecord_jj_customer_reference",
          ignoreFieldChange: true,
          isDynamic: true,
        });

        //Setting values
        customerRecord.setValue({
          fieldId: "custrecord_jj_cust_ref_name",
          value: custName,
          ignoreFieldChange: true,
        });
        customerRecord.setValue({
          fieldId: "custrecord_jj_cust_ref_email",
          value: custEmail,
          ignoreFieldChange: true,
        });

        customerRecord.setValue({
          fieldId: "custrecord_jj_cust_reference",
          value: customerId,
          ignoreFieldChange: true,
        });

        customerRecord.setValue({
          fieldId: "custrecord_jj_cust_ref_subject",
          value: custSubject,
          ignoreFieldChange: true,
        });

        customerRecord.setValue({
          fieldId: "custrecord_jj_cust_ref_message",
          value: custMessage,
          ignoreFieldChange: true,
        });

        var recId = customerRecord.save({
          ignoreMandatoryFields: true,
        });

        let form = serverWidget.createForm({
          title: "Custom Record Creation !",
        });

        let resultField = (form.addField({
          id: "custpage_result",
          type: serverWidget.FieldType.INLINEHTML,
          label: "Text",
        }).defaultValue = `
            <h1> Custom Record Created </h1>
            <p> Customer Name : ${custName} </p>
            <p> Customer Email : ${custEmail} </p>
            <p> Subject : ${custSubject} </p>
            <p> Message : ${custMessage} </p>
    `);

        scriptContext.response.writePage({
          pageObject: form,
        });

        if (recId) {
          sendAdminEmail();
        }

        if (saleRep) {
          sendRepEmail(salesRepId);
        }
      }
    } catch (e) {
      log.error("Error caught", e.message);
    }
  }

  /**
   * Function to search for duplicate records with the same form data
   * @param {string} name - name of the customer
   * @param {string} email - email address of the customer
   * @returns {void}
   */

  function duplicateSearch(name, email) {
    try {
      let searchForDuplicate = search.create({
        type: "customrecord_jj_customer_reference",
        filters: [
          ["custrecord_jj_cust_ref_name", "is", name],
          "AND",
          ["custrecord_jj_cust_ref_email", "is", email],
        ],
        columns: [
          search.createColumn({
            name: "custrecord_jj_cust_ref_name",
            label: "Customer Name",
          }),
          search.createColumn({ name: "internalid", label: "Internal ID" }),
        ],
      });

      let duplicate;

      searchForDuplicate.run().each(function (result) {
        duplicate = result.getValue({ name: "internalid" });
      });

      return duplicate;
    } catch (e) {
      log.error("Error caught", e.message);
    }
  }

  /**
   * Function to create a search
   * @param {string} email : the email which was entered in the form
   * @param  scriptContext
   * @returns {search object}
   */
  function emailSearch(email) {
    try {
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
    } catch (e) {
      log.error("Error caught", e.message);
    }
  }

  /**
   * Function to send email notification to the NetSuite admin
   * @param {}
   * @returns {void}
   */
  function sendAdminEmail() {
    try {
      email.send({
        author: -5,
        recipients: [-5],
        subject: "Custom Record Creation",
        body: "A custom customer record was created",
      });
    } catch (e) {
      log.error("Error caught", e.message);
    }
  }

  /**
   * Function to send email notification to the customer's sales rep, if any
   * @param {int} rep - internal id of the sales rep
   * @returns {void}
   */
  function sendRepEmail(rep) {
    try {
      var salesRepEmail = search.lookupFields({
        type: search.Type.EMPLOYEE,
        id: rep,
        columns: ["email"],
      });

      email.send({
        author: -5,
        recipients: [salesRepEmail.email],
        subject: "Custom record creation",
        body: "A custom customer record was created",
      });
    } catch (e) {
      log.error("Error caught:", e.message);
    }
  }

  return { onRequest };
});
