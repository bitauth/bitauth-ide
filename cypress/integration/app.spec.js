/// <reference types="cypress" />

// TODO: cypress coverage https://github.com/cypress-io/instrument-cra
// https://github.com/cypress-io/instrument-cra/issues/132

describe('App', function () {
  beforeEach(function () {
    cy.visit('/');
  });

  it('renders the app', function () {
    cy.get('.bitauth').should('contain', 'bitauth');
    cy.get('.WelcomePane').should('contain', 'Choose a template to begin');
    cy.percySnapshot('WelcomePane');
  });
});
