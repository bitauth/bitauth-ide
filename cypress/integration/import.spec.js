/// <reference types="cypress" />

describe('Import', function () {
  beforeEach(function () {
    cy.visit('/').then(() => {
      localStorage.setItem('BITAUTH_IDE_GUIDE_POPOVER_DISMISSED', 1);
    });
  });

  it('allows template imports and displays pre-evaluation VM errors', () => {
    cy.get('.WelcomePane').should('contain', 'Choose a template to begin');
    cy.contains('Import or Restore Template').click();
    cy.contains('Import/Export Authentication Template');
    cy.get('.import-export-editor .monaco-editor')
      .contains('$schema')
      .should('have.css', 'color', 'rgb(156, 220, 254)');
    cy.percySnapshot('Import/Export Dialog');
    cy.fixture('non-push-unlocking-opcodes').then((json) => {
      cy.get('.import-export-editor .monaco-editor textarea')
        .type('{del}'.repeat(250))
        .type(JSON.stringify(json).replace(/{/g, '{{}'));
    });
    cy.contains('Import Template').click();
    cy.get('.ProjectExplorer').contains('li', 'Unlock').click();
    cy.get('.ScriptEditor-unlocking > .title').contains('Unlock');
    cy.get('.ScriptEditor-unlocking')
      .contains('OP_DUP')
      .should('have.css', 'color', 'rgb(60, 157, 218)');
    cy.get('.ScriptEditor-unlocking .editor-top-margin-view-zone');
    cy.get('.ScriptEditor-locking')
      .contains('OP_ADD')
      .should('have.css', 'color', 'rgb(60, 157, 218)');
    cy.get('.ScriptEditor-locking .editor-top-margin-view-zone');
    cy.percySnapshot('Non-Push Unlocking Opcodes');
  });
});
