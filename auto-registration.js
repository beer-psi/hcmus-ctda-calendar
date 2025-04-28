// ==UserScript==
// @name        HCMUS CTDA Automatic Subject Registration
// @match       https://portal.ctdb.hcmus.edu.vn/dang-ky-hoc-phan/sinh-vien-apcs
// @grant       none
// @version     1.0.1
// @author      -
// @description 4/26/2025, 10:28:09 AM
// ==/UserScript==

/// <reference types="@types/knockout" />
/// <reference types="@types/toastr" />
/// <reference types="./jquery-confirm.d.ts" />
/// <reference types="./ajax.d.ts" />

/**
 * The Knockout.js view model for the subject registration page.
 *
 * @typedef {{
*  svDetails: KnockoutObservable<{
*    MaSV?: number,
*    MSSV: string,
*    HoTen?: string,
*    LoaiSV?: "CTTT" | "CLC",
*    SoTCMax?: number,
*    SoMonMax?: number,
*    SoTCDaDK?: number,
*    SoMonDaDK?: number,
*  }>;
*  errorMessage: KnockoutObservable<string>;
*  dsDaDangKy: KnockoutObservableArray<Subject>;
*  dsChuaDangKy: KnockoutObservableArray<Subject>;
*  hasMonCaiThien: KnockoutObservable<boolean>;
*  maxCredits: KnockoutObservable<string | undefined>;
*  maxSubject: KnockoutObservable<string | undefined>;
*  regCredits: KnockoutObservable<string | undefined>;
*  regSubject: KnockoutObservable<string | undefined>;
*  ok: KnockoutObservable<boolean>;
*  loadDangKyHocPhan: () => any;
* }} DKHPViewModel
*/

(async () => {
    "use strict";

    if (document.location.pathname !== "/dang-ky-hoc-phan/sinh-vien-apcs") {
        return;
    }

    const dkhpModule = document.querySelector(".ModCTDBDKHocPhanC");

    if (!dkhpModule) {
        return;
    }

    const dkhpTable = dkhpModule.querySelector("#divMonChuaDK table tbody");

    if (!dkhpTable) {
        return;
    }

    /**
     * @type {DKHPViewModel | undefined}
     */
    const vmDKHP = ko.dataFor(dkhpModule);

    if (!vmDKHP) {
        return;
    }

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const addedNode of mutation.addedNodes) {
                if (addedNode.nodeName !== "TR") {
                    continue;
                }

                const row = /** @type {Element} */(addedNode);
                const cell = row.querySelectorAll("td")[1];

                if (!cell) {
                    continue;
                }

                const vm = ko.dataFor(row);

                cell.textContent += ` (${vm.MaMG})`;
            }
        }
    });

    observer.observe(dkhpTable, { childList: true });

    const textarea = document.createElement("textarea");
    let textareaDebounce = 0;

    textarea.placeholder = "Enter internal subject IDs (shown in parentheses) separated by whitespace.";
    textarea.value = localStorage.getItem("registeredSubjectIDs") ?? "";
    textarea.addEventListener("keyup", (e) => {
        if (textareaDebounce) {
            clearTimeout(textareaDebounce);
        }

        textareaDebounce = setTimeout(() => {
            localStorage.setItem("registeredSubjectIDs", textarea.value);
        }, 1000);
    });

    const button = document.createElement("button");

    button.textContent = "Bulk register subjects";
    button.onclick = async (e) => {
        e.preventDefault();

        const subjectIDs = textarea.value.split(/\s+/gu).map((s) => Number(s));
        const validSubjectIDs = vmDKHP.dsChuaDangKy().map((s) => s.MaMG);
        const registeringSubjectIDs = subjectIDs.filter((id) => validSubjectIDs.includes(id));

        if (registeringSubjectIDs.length === 0) {
            toastr.warning("No valid subjects entered.");
            return;
        }

        const promises = registeringSubjectIDs.map((id) => {
            const ajax = new Ajax("addMonDangKy", id);

            return new Promise((resolve, reject) => {
                ajax.post((result) => {
                    const respData = JSON.parse(result);

                    if (respData.Status === "OK") {
                        resolve(respData);
                    } else {
                        reject(respData);
                    }
                });
            });
        });
        const result = await Promise.allSettled(promises);

        vmDKHP.loadDangKyHocPhan();

        if (result.some((r) => r.status === "rejected")) {
            const errors = result
                .filter((r) => r.status === "rejected")
                .map((r) => r.reason.Message);

            $.alert({
                type: "red",
                title: "Could not register some subjects",
                content: errors.join("<br>"),
                buttons: {
                    ok: {
                        text: "Ok",
                    }
                }
            })
        } else {
            toastr.success("Successfully registered subjects.");
        }
    };

    dkhpModule.querySelector(".panel .panel-body")?.insertAdjacentElement("beforeend", textarea);
    dkhpModule.querySelector(".panel .panel-body")?.insertAdjacentElement("beforeend", document.createElement("br"));
    dkhpModule.querySelector(".panel .panel-body")?.insertAdjacentElement("beforeend", button);

    // if we have prefilled subjects and we can register subjects now, do it
    if (localStorage.getItem("registeredSubjectIDs") && vmDKHP.ok()) {
        // hack, wait for network to load
        setTimeout(() => button.click(), 2000);
    }
})();
