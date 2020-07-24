/// <reference types="cypress" />

describe('App', function () {
  beforeEach(function () {
    cy.visit('/').then(() => {
      localStorage.setItem('BITAUTH_IDE_GUIDE_POPOVER_DISMISSED', 1);
    });
  });

  it('renders the welcome pane', function () {
    cy.get('.bitauth').should('contain', 'bitauth');
    cy.get('.WelcomePane').should('contain', 'Choose a template to begin');
    cy.percySnapshot('WelcomePane');
  });

  it('loads the single signature template', function () {
    cy.get('.WelcomePane').should('contain', 'Choose a template to begin');
    cy.contains('Single Signature (P2PKH)').click();
    cy.get('.EditorPane').should('contain', 'Single Signature (P2PKH)');
    cy.contains('Unlock').click();
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
    cy.get('.ScriptEditor > .editor').contains('schnorr_signature');
  });
});
