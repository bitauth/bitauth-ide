import '../editor-dialog.scss';
import './GuideDialog.scss';
import React from 'react';
import { ActionCreators } from '../../../state/reducer';
import { ActiveDialog } from '../../../state/types';
import { Classes, Dialog } from '@blueprintjs/core';

export const GuideDialog = ({
  activeDialog,
  closeDialog
}: {
  activeDialog: ActiveDialog;
  closeDialog: typeof ActionCreators.closeDialog;
}) => {
  return (
    <Dialog
      className="editor-dialog GuideDialog"
      onClose={() => closeDialog()}
      // title="Bitauth IDE Guide"
      isOpen={activeDialog === ActiveDialog.guide}
      canOutsideClickClose={true}
    >
      <div className={Classes.DIALOG_BODY}>
        <h2>Welcome!</h2>
        <p>
          <em>Bitauth IDE</em> is an integrated development environment for
          bitcoin authentication. This guide will explain features of the IDE
          and templating language.
        </p>
        <h2>Bitauth Templates</h2>
        <p>
          When you work in Bitauth IDE, you're working on a{' '}
          <em>Bitauth Template</em>. It's a JSON file which fully describes the
          authentication scheme for a bitcoin wallet. Compatible wallet software
          can import your template and generate a fully-functional wallet, even
          for complex, multi-party schemes. The IDE lets you write, test, and
          export Bitauth templates.
        </p>
        <p>Bitauth templates include two primary concepts:</p>
        <ul>
          <li>
            <em>Entities</em> – the individuals and/or devices participating in
            the wallet
          </li>
          <li>
            <em>Scripts</em> – the code used by wallet software to create
            addresses and transactions
          </li>
        </ul>
        <h3>Entities</h3>
        <p>
          A Bitauth template defines a set of <em>entities</em> which will use
          the template. Each entity can be assigned one or more{' '}
          <em>variables</em> for which they are responsible. There are currently
          6 variable types: <em>Key</em>, <em>HDKey</em>, <em>WalletData</em>,{' '}
          <em>AddressData</em>, <em>CurrentBlockHeight</em>, and{' '}
          <em>CurrentBlockTime</em>.
        </p>
        <p>
          When a wallet is created, each entity shares the public elements of
          their variables. Values are validated to prevent man-in-the-middle
          attacks, and then wallet addresses are generated.
        </p>
        <h3>Scripts</h3>
        <p>
          Bitauth templates define a set of scripts used by the entities. There
          are 4 types of scripts:
        </p>
        <ul>
          <li>
            <em>Locking Scripts</em> – scripts from which wallet addresses are
            generated.
          </li>
          <li>
            <em>Unlocking Scripts</em> – scripts which enable wallet software to
            spend from the wallet.
          </li>
          <li>
            <em>Isolated Scripts</em> – scripts used as macros or bytecode
            templates.
          </li>
          <li>
            <em>Isolated Script Tests</em> – a pair of scripts (<em>Setup</em>{' '}
            and <em>Check</em>) used to verify the functionality of an isolated
            script.
          </li>
        </ul>
        <h2>Bitauth Templating Language (BTL)</h2>
        <p>
          Bitauth template scripts are written in{' '}
          <em>Bitauth Templating Language (BTL)</em>. The language is very
          low-level – any bitcoin virtual machine bytecode can be represented in
          BTL.
        </p>
        <h3>Opcodes</h3>
        <p>
          Opcode identifiers in BTL are prefixed with <code>OP_</code>. During
          compilation, opcode identifiers are replaced with their bytecode
          equivalents. E.g <code>OP_0 OP_1 OP_ADD</code> will compile to the
          bytecode <code>005193</code> (hex-encoded).
        </p>
        <p>
          All opcodes are also autocompleted within the IDE. To read a
          description of a given opcode, hover over it in the editor. You can
          also find resources describing bitcoin opcodes online.
        </p>
        <h3>Literal Data Types</h3>
        <p>BTL supports 3 literal data types:</p>
        <ul>
          <li>
            <em>Hex literals</em> – hex-encoded data, prefixed with{' '}
            <code>0x</code>, e.g. <code>0xc0de</code>.
          </li>
          <li>
            <em>UTF8 literals</em> – UTF8-encoded data, surrounded by single
            quotes (<code>'</code>) or double quotes (<code>"</code>), e.g.{' '}
            <code>'this is a string'</code> or <code>"UTF8 👍"</code>.
          </li>
          <li>
            <em>BigInt literals</em> – integers, e.g. <code>1234</code>.
            (Bitauth IDE supports arbitrary integer sizes, but numbers which
            overflow 64 bits are considered non-standard and may not be
            supported in the future.)
          </li>
        </ul>
        <h3>Push Statements</h3>
        <p>
          Push statements are surrounded by <code>&lt;</code> and{' '}
          <code>&gt;</code>, and generate the opcode to push their compiled
          contents to the stack.
        </p>
        <p>
          For example <code>&lt;"abc"&gt;</code> will generate the bytecode to
          push <code>"abc"</code> (<code>616263</code>) to the stack:{' '}
          <code>03616263</code> (disassembled:{' '}
          <code>OP_PUSHBYTES_3 0x616263</code>). Pushes are automatically
          minimized: e.g. <code>&lt;1&gt;</code> compiles to <code>51</code>{' '}
          (disassembled: <code>OP_1</code>), and <code>&lt;OP_0&gt;</code>{' '}
          (equivalent to <code>&lt;0x00&gt;</code>) compiles to{' '}
          <code>0100</code> (disassembled: <code>OP_PUSHBYTES_1 0x00</code>).
        </p>
        <p>
          Any valid BTL can be contained in a push statement (including further
          push statements), so code like{' '}
          <code>&lt;&lt;&lt;&lt;1&gt;&gt;&gt;&gt;</code> is valid. (Result:{' '}
          <code>03020151</code>)
        </p>
        <h3>Including Variables &amp; Scripts</h3>
        <p>
          Every Script and variable has a unique ID within the template. Both
          can be included by referencing the unique ID. E.g. a{' '}
          <code>WalletData</code> variable with an ID of <code>nonce</code> can
          be pushed to the stack with <code>&lt;nonce&gt;</code>.
        </p>
        <p>
          When referenced, variables and scripts are included directly as
          bytecode. This makes it possible to provide segments of bytecode in
          variables and to use isolated scripts as macros. E.g.{' '}
          <code>&lt;my_number&gt; pad_value</code> might push the variable{' '}
          <code>my_number</code> and then insert the <code>pad_value</code>{' '}
          script, which might be defined as <code>&lt;8&gt; OP_NUM2BIN</code>,
          padding <code>my_number</code> to 8 bytes.
        </p>
        <h3>Variable Operations</h3>
        <p>
          Some variable types provide operations which are accessed with a
          period (<code>.</code>), e.g. the public key of the <code>owner</code>{' '}
          Key can be pushed to the stack with{' '}
          <code>&lt;owner.public_key&gt;</code>.
        </p>
        <p>
          Several operations are available to <code>Key</code> and{' '}
          <code>HDKey</code> variables:
        </p>
        <ul>
          <li>
            <code>public_key</code>– include the public key.
          </li>
          <li>
            <code>signature.[signing_serialization_type]</code>– create an ECDSA
            signature using the key and the selected signing serialization
            algorithm.
          </li>
          <li>
            <code>schnorr_signature.[signing_serialization_type]</code>– create
            a schnorr signature using the key and the selected signing
            serialization algorithm.
          </li>
          <li>
            <code>data_signature.[SCRIPT_ID]</code>– create a data signature
            using the key by signing the compiled output of SCRIPT_ID.
          </li>
          <li>
            <code>schnorr_data_signature.[SCRIPT_ID]</code>– create a schnorr
            data signature using the key by signing the compiled output of
            SCRIPT_ID.
          </li>
        </ul>
        <h4>Signatures</h4>
        <p>
          Signatures (<code>signature</code> and <code>schnorr_signature</code>)
          are generated by serializing elements of the signed transaction in a
          standard way, hashing the serialization, and signing the message hash.
        </p>
        <p>There are 6 signing serialization algorithms:</p>
        <ul>
          <li>
            <code>all_outputs</code>– the recommended (and most commonly used)
            signing serialization algorithm (A.K.A. "SIGHASH_ALL")
          </li>
          <li>
            <code>all_outputs_single_input</code>– A.K.A. "SIGHASH_ALL" with
            "ANYONE_CAN_PAY"
          </li>
          <li>
            <code>corresponding_output</code>– A.K.A. "SIGHASH_SINGLE"
          </li>
          <li>
            <code>corresponding_output_single_input</code>– A.K.A.
            "SIGHASH_SINGLE" with "ANYONE_CAN_PAY"
          </li>
          <li>
            <code>no_outputs</code>– A.K.A. "SIGHASH_NONE"
          </li>
          <li>
            <code>no_outputs_single_input</code>– A.K.A. "SIGHASH_NONE" with
            "ANYONE_CAN_PAY"
          </li>
        </ul>
        <p>
          Most authentication schemes should use the <code>all_outputs</code>{' '}
          setting, e.g. <code>&lt;owner.signature.all_outputs&gt;</code>. This
          algorithm signs each output of the transaction using the private key.
          This prevents an attacker from being able to reuse the signature on a
          different transaction (which the key holder did not intend to
          authorize).
        </p>
        <p>
          For unique circumstances, the other signing serialization algorithms
          can also be specified – you can find resources online to describe the
          other algorithms in further detail.
        </p>
        <p>
          To display debugging information, Bitauth IDE transparently integrates
          scripts into a simple transaction and evaluates it in the{' '}
          <a target="_blank" href="https://github.com/bitauth/bitcoin-ts">
            bitcoin-ts
          </a>{' '}
          virtual machine implementation.
        </p>
        <h4>Data Signatures</h4>
        <p>
          For data signatures (<code>data_signature</code> and{' '}
          <code>schnorr_data_signature</code>), the message to hash and sign is
          provided as a script, e.g.{' '}
          <code>&lt;owner.data_signature.message&gt;</code> will hash the
          compiled bytecode representation of the <code>message</code> isolated
          script, signing the hash using the <code>owner</code> Key.
        </p>
        <h3>Evaluations</h3>
        <p>
          Evaluations are segments of code surrounded by <code>$(</code> and
          <code>)</code> which use the bitcoin virtual machine itself to assist
          in generating bytecode. The contents of an evaluation are compiled and
          evaluated, and the top element on the resulting stack is then inserted
          as bytecode. E.g. <code>$(&lt;1&gt; &lt;2&gt; OP_ADD) "abc"</code>{' '}
          produces the bytecode <code>03616263</code> (disassembled:{' '}
          <code>OP_PUSHBYTES_3 0x616263</code>).
        </p>
        <p>
          This is surprisingly useful – often the procedure to create a desired
          bytecode sequence is similar to the procedure later used to validate
          it. For example, a P2SH locking script is generated using this BTL:
        </p>
        <p>
          <code>
            OP_HASH160 &lt;$(&lt;redeem_script&gt; OP_HASH160)&gt; OP_EQUAL
          </code>
        </p>
        <p>
          First, in the evaluation, the compiled bytecode of{' '}
          <code>redeem_script</code> is pushed to the stack and hashed. Then the
          final locking script can be generated by inserting the bytecode for
          OP_HASH160, followed by a push of the generated redeem script hash,
          followed by the bytecode for OP_EQUAL.
        </p>
        <h2>Getting Started</h2>
        <p>
          The easiest way to get started working with Bitauth IDE is to review
          the example templates. You'll find examples of both common wallet
          types and of complex, multi-entity authentication schemes.
        </p>
        <h3>Thanks for reading!</h3>
        <p>
          This guide is still under development. If you have questions or ideas
          for improvement, please{' '}
          <a
            target="_blank"
            href="https://github.com/bitauth/bitauth-ide/issues"
          >
            open an issue on GitHub
          </a>{' '}
          or{' '}
          <a target="_blank" href="https://twitter.com/bitjson">
            message me on twitter
          </a>
          .
        </p>
      </div>
    </Dialog>
  );
};
