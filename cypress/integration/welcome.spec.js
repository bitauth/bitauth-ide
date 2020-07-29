/// <reference types="cypress" />

describe('Welcome', function () {
  beforeEach(function () {
    cy.visit('/');
    cy.hideGuidePopover();
    cy.loadVmsAndCrypto();
  });

  it('loads the single signature template', function () {
    cy.get('.WelcomePane').should('contain', 'Choose a template to begin');
    cy.percySnapshot('WelcomePane');
    cy.contains('Single Signature (P2PKH)').click();
    cy.get('.EditorPane').should('contain', 'Single Signature (P2PKH)');
    cy.get('.ProjectExplorer').contains('li', 'Unlock').click();
    cy.get('.ScriptEditor-unlocking > .title').contains('Unlock');
    cy.get('.ScriptEditor-unlocking')
      .contains('schnorr_signature')
      .should('have.css', 'color', 'rgb(138, 221, 255)');
    cy.get('.ScriptEditor-unlocking .editor-top-margin-view-zone');
    cy.get('.ScriptEditor-locking')
      .contains('OP_DUP')
      .should('have.css', 'color', 'rgb(60, 157, 218)');
    cy.get('.ScriptEditor-locking .editor-top-margin-view-zone');
    cy.percySnapshot('Single Signature (Unlock)');
  });

  it('loads the 2-of-3 Multisig template', function () {
    cy.get('.WelcomePane').should('contain', 'Choose a template to begin');
    cy.contains('2-of-3 Multi').click();
    cy.get('.EditorPane').should('contain', '2-of-3 Multi');
    cy.get('.ProjectExplorer').contains('li', 'Cosigner 1 & 2').click();
    cy.get('.ScriptEditor-unlocking > .title').contains('Cosigner 1 & 2');
    cy.get('.ScriptEditor-unlocking')
      .contains('all_outputs')
      .should('have.css', 'color', 'rgb(138, 221, 255)');
    cy.get('.ScriptEditor-unlocking .editor-top-margin-view-zone');
    cy.get('.ScriptEditor-locking')
      .contains('OP_CHECKMULTISIG')
      .should('have.css', 'color', 'rgb(208, 129, 196)');
    cy.get('.ScriptEditor-locking .editor-top-margin-view-zone');
    cy.percySnapshot('2-of-3 Multisig (Cosigner 1 & 2)');
  });

  it('loads the 2-of-2 Recoverable Vault template', function () {
    cy.get('.WelcomePane').should('contain', 'Choose a template to begin');
    cy.contains('2-of-2 Recoverable Vault').click();
    cy.get('.EditorPane').should('contain', '2-of-2 Recoverable Vault');

    cy.get('.ProjectExplorer').contains('li', 'Recover – Signer 1').click();
    cy.get('.ScriptEditor-unlocking > .title').contains('Recover – Signer 1');
    cy.get('.ScriptEditor-unlocking')
      .contains('all_outputs')
      .should('have.css', 'color', 'rgb(138, 221, 255)');
    cy.get('.ScriptEditor-unlocking .editor-top-margin-view-zone');
    cy.get('.ScriptEditor-locking')
      .contains('OP_CHECKLOCKTIMEVERIFY')
      .should('have.css', 'color', 'rgb(217, 218, 162)');
    cy.get('.ScriptEditor-locking .editor-top-margin-view-zone');
    cy.percySnapshot('2-of-2 Recoverable Vault (Recover – Signer 1)');

    cy.get('.ProjectExplorer').contains('li', 'Standard Spend').click();
    cy.get('.ScriptEditor-unlocking > .title').contains('Standard Spend');
    cy.get('.ScriptEditor-unlocking')
      .contains('all_outputs')
      .should('have.css', 'color', 'rgb(138, 221, 255)');
    cy.get('.ScriptEditor-unlocking .editor-top-margin-view-zone');
    cy.get('.ScriptEditor-locking')
      .contains('OP_CHECKLOCKTIMEVERIFY')
      .should('have.css', 'filter', 'grayscale(1)');
    cy.get('.ScriptEditor-locking .editor-top-margin-view-zone');
    cy.percySnapshot('2-of-2 Recoverable Vault (Standard Spend)');
  });

  it('loads the Scratch Pad template', function () {
    cy.get('.WelcomePane').should('contain', 'Choose a template to begin');
    cy.contains('Scratch Pad').click();
    cy.get('.ScriptEditor-isolated > .title').contains('Scratch Pad');
    cy.get('.ScriptEditor-isolated')
      .contains('OP_HASH160')
      .should('have.css', 'color', 'rgb(60, 157, 218)');
    cy.get('.ScriptEditor-isolated .editor-top-margin-view-zone');
    cy.percySnapshot('Scratch Pad');
  });
});
