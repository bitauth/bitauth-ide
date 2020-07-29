/// <reference types="cypress" />

describe('Routing', function () {
  it('opens the guide at /guide', function () {
    cy.visit('/guide');
    cy.startBitauthIDE();
    cy.get('.GuideDialog').should('contain', 'Welcome!');
    cy.percySnapshot('Guide route');
  });

  it('opens the guide at /guide/', function () {
    cy.visit('/guide/');
    cy.startBitauthIDE();
    cy.get('.GuideDialog').should('contain', 'Welcome!');
  });
});
