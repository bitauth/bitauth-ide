/// <reference types="cypress" />

describe('Auto-Import', function () {
  it('auto-imports from share links', () => {
    cy.visit(
      'http://localhost:3000/import-template/eJw9Uu1q20AQfJXlKBiMYn3QuLYJATcp-EdpE-L8qotYS6voaulO3K2dmOA3KH2FvmIeIXuSW5C4ndHM7EqrV_XBFzW1qBaqZu78Io63mnHP9aSwbTw89HEgyLAukLU1F0xt1yDTxSGZDJLJL2-NilRJvnC6CyqJFMJgS1I9ipkbKoUJOazJq8XrKVKDPIBQIhd13mEZ4Nn5MLBwh8E8yIWOx-ONGcO61h68lnEI_k0FLe7Ig2Yg9EdgC_TSkdOtdIZgetZcQ2s9g-0KKyNPAhvub5YpAu5D-04gFR2w2UtuCegBobHFTpuns6C3ri08W7cbgnd0FJkpZawng7x35CPAUtwG9ubsDq5zhyAVDxzQadw2QW0dsDuCZ3QcWlXOtsGBxsoe3P83Dc3jjdmYq1FNTWNH13A1evv7-8_oemO-3-U3y3V_rpYPq3SaiC55qaiYlrM5FXPazqbTy21alR9ngj5VVYYolxxZkgwJX-4fl1_Flw1weXurTmFr-66zTj6JWvxQn29WeZak8zxNZUMDypI8uVQ_I3Ug5_ufITm9Az7B1DA='
    );
    cy.startBitauthIDE();
    cy.get('.ProjectExplorer').contains('li', 'Scratch Pad').click();
    cy.contains('This simple template makes it easy to experiment');
  });

  it('handles share links with invalid JSON contents', () => {
    cy.visit('/import-template/eJxLKsrPTs0DAAjBAoI=');
    cy.startBitauthIDE();
    cy.on('window:alert', (str) => {
      expect(str).to.equal(
        `This sharing URL seems to be corrupted. Please check the link and try again.`
      );
    });
    cy.contains('Choose a template to begin');
  });

  it('gracefully handles outdated share links', () => {
    cy.visit(
      // cspell: disable-next-line
      '/import-template/eJylUl1r2zAU_StC9KGF2nEC27pQCmmWzSWFektSKMswiqzWWmRJSHKCCfnvu5Lz1fRxxmAd-ercc47uBl9YWrKK4D4undO23-ksuCO1K2Oqqk7703b8BpOOU-K4kpFjlRbEsWiVxG1J_Ncqia9xwSw1XPsqoBwg64gsiCmQ5fJNsOiVUKcMes-H9nxoXXJaotoyizLSRE5FWb0QnEZj1kQpsSW6zHrZOL2K53IupyW3CF5aGwNsokHAiiplHQLx1Skxl54V-S0okcytlVnGIFiSioHSSZCHJvxNElcbtu8DFV6n48zi_gartWTGL3bHngI-tz0tfcOCr3hREwGmFKJEIquZLNCrURWIANlrIgRzXkR7GDr8xrqnl2UuFF3Cfi3D4s81XhHDyUKcqfjYVhu-8n6XrNmFSZV0Rgl73rPyzH3c_c_nGCFcEQDX6D3YwnPibXPq7RhhyBk9tobbYh9sln-bZXMJ33QwSbufE3R7cYlug_VYh6HIweQdOlbM5VWAo5-zwePz6NfD95dAMExHw_Hk4QfeHhI9tp9JcdZ61wPmWipjcrsfiRiiy1XtdO3s3Vx-lHK4MDB76jWkUGutjGOFv-P7YZr3ku7XPPkEZw4ohHk_efboZoemQ4--5MlNmAJmbLjrZPsPPHE5fQ=='
    );
    cy.on('window:alert', (str) => {
      expect(str).to.equal(
        `This link may have been created manually or with an outdated version of Bitauth IDE: the link is valid, but the authentication template it encodes is not.\n\nThe invalid template will now be shown in the import dialog: you can manually edit the JSON to correct any validation errors, then import the template. If you have trouble, let us know in the community chat, we're happy to help!`
      );
    });
    cy.startBitauthIDE();
    cy.get('.show-next-issue-button').click();
    cy.contains('Property mock is not allowed.');
  });

  it('auto-imports from GitHub Gists (stubbed)', () => {
    cy.server();
    cy.route(
      'GET',
      'https://api.github.com/gists/a055ad6ba863a4472767bb5e441a3437',
      'fixture:a055ad6ba863a4472767bb5e441a3437.json'
    );
    cy.visit('/import-gist/a055ad6ba863a4472767bb5e441a3437');
    cy.startBitauthIDE();
    cy.get('.EditorPane').should(
      'contain',
      'Fixture: Single Signature (P2PKH)'
    );
  });

  it('auto-imports from GitHub Gists (live)', () => {
    cy.server();
    cy.visit('/import-gist/a055ad6ba863a4472767bb5e441a3437');
    cy.startBitauthIDE();
    cy.get('.EditorPane').should('contain', 'Single Signature (P2PKH)');
  });

  it('auto-imports from GitHub Gists (stubbed)', () => {
    cy.server();
    cy.route(
      'GET',
      'https://api.github.com/gists/a055ad6ba863a4472767bb5e441a3437',
      'fixture:a055ad6ba863a4472767bb5e441a3437.json'
    );
    cy.visit('/import-gist/a055ad6ba863a4472767bb5e441a3437');
    cy.startBitauthIDE();
    cy.get('.EditorPane').should(
      'contain',
      'Fixture: Single Signature (P2PKH)'
    );
  });
});
