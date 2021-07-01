// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "openzeppelin-solidity/contracts/token/ERC1155/IERC1155.sol";
import "openzeppelin-solidity/contracts/token/ERC1155/IERC1155Receiver.sol";
import "openzeppelin-solidity/contracts/token/ERC1155/extensions/IERC1155MetadataURI.sol";
import "openzeppelin-solidity/contracts/utils/Address.sol";
import "openzeppelin-solidity/contracts/utils/Context.sol";
import "openzeppelin-solidity/contracts/utils/introspection/ERC165.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

import "hardhat/console.sol";

contract ERC1155Defter is Context, ERC165, IERC1155, IERC1155MetadataURI {
    using Address for address;

    // Mapping from token ID to account balances
    mapping(uint256 => mapping(address => uint256)) private _balances;

    // Mapping from account to operator approvals
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    // Mapping from account to nonce
    mapping(address => uint256) public _nonces;

    string private _uri;

    constructor(string memory uri_) {
        _setURI(uri_);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC165, IERC165)
        returns (bool)
    {
        return
            interfaceId == type(IERC1155).interfaceId ||
            interfaceId == type(IERC1155MetadataURI).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function uri(uint256) public view virtual override returns (string memory) {
        return _uri;
    }

    function balanceOf(address account, uint256 id)
        public
        view
        virtual
        override
        returns (uint256)
    {
        require(
            account != address(0),
            "ERC1155: balance query for the zero address"
        );
        return _balances[id][account];
    }

    function balanceOfBatch(address[] memory accounts, uint256[] memory ids)
        public
        view
        virtual
        override
        returns (uint256[] memory)
    {
        require(
            accounts.length == ids.length,
            "ERC1155: accounts and ids length mismatch"
        );

        uint256[] memory batchBalances = new uint256[](accounts.length);

        for (uint256 i = 0; i < accounts.length; ++i) {
            batchBalances[i] = balanceOf(accounts[i], ids[i]);
        }

        return batchBalances;
    }

    function setApprovalForAll(address operator, bool approved)
        public
        virtual
        override
    {
        require(
            _msgSender() != operator,
            "ERC1155: setting approval status for self"
        );

        _operatorApprovals[_msgSender()][operator] = approved;
        emit ApprovalForAll(_msgSender(), operator, approved);
    }

    function isApprovedForAll(address account, address operator)
        public
        view
        virtual
        override
        returns (bool)
    {
        return _operatorApprovals[account][operator];
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public virtual override {
        require(to != address(0), "ERC1155: transfer to the zero address");
        require(
            from == _msgSender() ||
                isApprovedForAll(from, _msgSender()) ||
                verifyForTransfer(from, to, id, amount, data),
            "ERC1155: caller is not owner nor approved"
        );

        address operator = _msgSender();

        _beforeTokenTransfer(
            operator,
            from,
            to,
            _asSingletonArray(id),
            _asSingletonArray(amount),
            data
        );

        uint256 fromBalance = _balances[id][from];
        require(
            fromBalance >= amount,
            "ERC1155: insufficient balance for transfer"
        );
        _balances[id][from] = fromBalance - amount;
        _balances[id][to] += amount;

        emit TransferSingle(operator, from, to, id, amount);

        _doSafeTransferAcceptanceCheck(operator, from, to, id, amount, data);
    }

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public virtual override {
        require(
            ids.length == amounts.length,
            "ERC1155: ids and amounts length mismatch"
        );
        require(to != address(0), "ERC1155: transfer to the zero address");
        require(
            from == _msgSender() ||
                isApprovedForAll(from, _msgSender()) ||
                verifyForBatchTransfer(from, to, ids, amounts, data),
            "ERC1155: transfer caller is not owner nor approved"
        );

        address operator = _msgSender();

        _beforeTokenTransfer(operator, from, to, ids, amounts, data);

        for (uint256 i = 0; i < ids.length; ++i) {
            uint256 id = ids[i];
            uint256 amount = amounts[i];

            uint256 fromBalance = _balances[id][from];
            require(
                fromBalance >= amount,
                "ERC1155: insufficient balance for transfer"
            );
            _balances[id][from] = fromBalance - amount;
            _balances[id][to] += amount;
            // emit LineTransferred(bytes32(id), from, to, amount);
        }

        emit TransferBatch(operator, from, to, ids, amounts);
        emit TransferBatchThatWorks(operator, from, to, ids, amounts);

        _doSafeBatchTransferAcceptanceCheck(
            operator,
            from,
            to,
            ids,
            amounts,
            data
        );
    }

    // TEMPORARY
    event TransferBatchThatWorks(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256[] ids,
        uint256[] amounts
    );

    function _setURI(string memory newuri) internal virtual {
        _uri = newuri;
    }

    function _mint(
        address account,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) internal virtual {
        require(account != address(0), "ERC1155: mint to the zero address");

        address operator = _msgSender();

        _beforeTokenTransfer(
            operator,
            address(0),
            account,
            _asSingletonArray(id),
            _asSingletonArray(amount),
            data
        );

        _balances[id][account] += amount;
        emit TransferSingle(operator, address(0), account, id, amount);

        _doSafeTransferAcceptanceCheck(
            operator,
            address(0),
            account,
            id,
            amount,
            data
        );
    }

    function _mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual {
        require(to != address(0), "ERC1155: mint to the zero address");
        require(
            ids.length == amounts.length,
            "ERC1155: ids and amounts length mismatch"
        );

        address operator = _msgSender();

        _beforeTokenTransfer(operator, address(0), to, ids, amounts, data);

        for (uint256 i = 0; i < ids.length; i++) {
            _balances[ids[i]][to] += amounts[i];
        }

        emit TransferBatch(operator, address(0), to, ids, amounts);

        _doSafeBatchTransferAcceptanceCheck(
            operator,
            address(0),
            to,
            ids,
            amounts,
            data
        );
    }

    function _burn(
        address account,
        uint256 id,
        uint256 amount
    ) internal virtual {
        require(account != address(0), "ERC1155: burn from the zero address");

        address operator = _msgSender();

        _beforeTokenTransfer(
            operator,
            account,
            address(0),
            _asSingletonArray(id),
            _asSingletonArray(amount),
            ""
        );

        uint256 accountBalance = _balances[id][account];
        require(
            accountBalance >= amount,
            "ERC1155: burn amount exceeds balance"
        );
        _balances[id][account] = accountBalance - amount;

        emit TransferSingle(operator, account, address(0), id, amount);
    }

    function _burnBatch(
        address account,
        uint256[] memory ids,
        uint256[] memory amounts
    ) internal virtual {
        require(account != address(0), "ERC1155: burn from the zero address");
        require(
            ids.length == amounts.length,
            "ERC1155: ids and amounts length mismatch"
        );

        address operator = _msgSender();

        _beforeTokenTransfer(operator, account, address(0), ids, amounts, "");

        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            uint256 amount = amounts[i];

            uint256 accountBalance = _balances[id][account];
            require(
                accountBalance >= amount,
                "ERC1155: burn amount exceeds balance"
            );
            _balances[id][account] = accountBalance - amount;
        }

        emit TransferBatch(operator, account, address(0), ids, amounts);
    }

    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual {}

    function _doSafeTransferAcceptanceCheck(
        address operator,
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) private {
        if (to.isContract()) {
            try
                IERC1155Receiver(to).onERC1155Received(
                    operator,
                    from,
                    id,
                    amount,
                    data
                )
            returns (bytes4 response) {
                if (
                    response != IERC1155Receiver(to).onERC1155Received.selector
                ) {
                    revert("ERC1155: ERC1155Receiver rejected tokens");
                }
            } catch Error(string memory reason) {
                revert(reason);
            } catch {
                revert("ERC1155: transfer to non ERC1155Receiver implementer");
            }
        }
    }

    function _doSafeBatchTransferAcceptanceCheck(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) private {
        if (to.isContract()) {
            try
                IERC1155Receiver(to).onERC1155BatchReceived(
                    operator,
                    from,
                    ids,
                    amounts,
                    data
                )
            returns (bytes4 response) {
                if (
                    response !=
                    IERC1155Receiver(to).onERC1155BatchReceived.selector
                ) {
                    revert("ERC1155: ERC1155Receiver rejected tokens");
                }
            } catch Error(string memory reason) {
                revert(reason);
            } catch {
                revert("ERC1155: transfer to non ERC1155Receiver implementer");
            }
        }
    }

    function _asSingletonArray(uint256 element)
        private
        pure
        returns (uint256[] memory)
    {
        uint256[] memory array = new uint256[](1);
        array[0] = element;

        return array;
    }

    /*
    ========================================================================
    ||                               DEFTER                               ||
    ========================================================================
    */

    struct Line {
        bool isOpen;
        uint256 totalAmount;
    }

    mapping(bytes32 => Line) lines;

    event LineOpened(
        bytes32 indexed lineID,
        address indexed issuer,
        address indexed receiver,
        address unit,
        uint256 amount,
        uint256 maturityDate
    );

    event LineClosed(bytes32 indexed lineID, address indexed issuer);

    event Withdrawn(
        bytes32 indexed lineID,
        address indexed receiver,
        uint256 amount
    );

    function hashLine(
        address from,
        uint256 maturityDate,
        address unit
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(from, maturityDate, unit));
    }

    function getBalances(bytes32 lineID, address holder)
        external
        view
        returns (uint256)
    {
        return _balances[uint256(lineID)][holder];
    }

    function mint(
        address from,
        address to,
        address unit,
        uint256 amount,
        uint256 maturityDate,
        bytes memory data
    ) external {
        require(
            maturityDate > (block.timestamp + 1 days),
            "can't open line for such a date this close"
        );

        require(
            from == msg.sender || verifyForOpen(from, maturityDate, unit, data),
            "msg.sender is not issuer nor has a valid signature"
        );
        bytes32 lineID = hashLine(from, maturityDate, unit);

        lines[lineID].isOpen = true;
        mintHelper(from, to, unit, maturityDate, lineID, amount);
    }

    function mintHelper(
        address from,
        address to,
        address unit,
        uint256 maturityDate,
        bytes32 lineID,
        uint256 amount
    ) internal {
        require(to != address(0), "can't open line for 0 address");
        require(amount != 0, "can't open line for 0 amount");

        _mint(to, uint256(lineID), amount, "");

        lines[lineID].totalAmount += amount;

        emit LineOpened(lineID, from, to, unit, amount, maturityDate);
    }

    function closeLine(
        address from,
        address unit,
        uint256 totalAmount,
        uint256 maturityDate,
        bytes memory data
    ) external {
        require(
            from == msg.sender ||
                verifyForClose(from, unit, totalAmount, maturityDate, data),
            "msg.sender is not line owner nor has a valid signature"
        );

        bytes32 _lineID = hashLine(from, maturityDate, unit);
        require(
            totalAmount == lines[_lineID].totalAmount,
            "total amounts don't match"
        );

        IERC20 token = IERC20(unit);
        token.transferFrom(from, address(this), totalAmount);

        lines[_lineID].isOpen = false;
        emit LineClosed(_lineID, from);
    }

    function withdraw(
        address from,
        bytes32 lineID,
        address unit,
        bytes memory data
    ) external {
        require(
            msg.sender == from || verifyForWithdraw(from, lineID, unit, data),
            "msg.sender is not receiver nor has a valid signature"
        );

        uint256 amount = _balances[uint256(lineID)][from];
        require(amount > 0, "amount can't be <= 0");

        IERC20 token = IERC20(unit);
        token.transfer(from, amount);

        _balances[uint256(lineID)][from] = 0;
        emit Withdrawn(lineID, from, amount);
    }

    function verifyForOpen(
        address from,
        uint256 maturityDate,
        address unit,
        bytes memory data
    ) public returns (bool) {
        bytes32 messageHash = keccak256(
            abi.encodePacked(from, maturityDate, unit, _nonces[from])
        );

        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);
        address recoveredSigner = recoverSigner(ethSignedMessageHash, data);

        if (recoveredSigner == from) {
            _nonces[from] += 1;
            return true;
        } else {
            return false;
        }
    }

    function verifyForTransfer(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public returns (bool) {
        bytes32 messageHash = keccak256(
            abi.encodePacked(from, to, id, amount, _nonces[from])
        );

        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);

        address recoveredSigner = recoverSigner(ethSignedMessageHash, data);

        if (recoveredSigner == from) {
            _nonces[from] += 1;
            return true;
        } else {
            return false;
        }
    }

    function verifyForBatchTransfer(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public returns (bool) {
        bytes32 messageHash = keccak256(
            abi.encodePacked(from, to, ids, amounts, _nonces[from])
        );

        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);

        address recoveredSigner = recoverSigner(ethSignedMessageHash, data);

        if (recoveredSigner == from) {
            _nonces[from] += 1;
            return true;
        } else {
            return false;
        }
    }

    function verifyForClose(
        address from,
        address unit,
        uint256 totalAmount,
        uint256 maturityDate,
        bytes memory data
    ) public returns (bool) {
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                from,
                unit,
                totalAmount,
                maturityDate,
                _nonces[from]
            )
        );

        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);

        address recoveredSigner = recoverSigner(ethSignedMessageHash, data);

        if (recoveredSigner == from) {
            _nonces[from] += 1;
            return true;
        } else {
            return false;
        }
    }

    function verifyForWithdraw(
        address from,
        bytes32 lineID,
        address unit,
        bytes memory data
    ) public returns (bool) {
        bytes32 messageHash = keccak256(
            abi.encodePacked(from, lineID, unit, _nonces[from])
        );

        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);

        address recoveredSigner = recoverSigner(ethSignedMessageHash, data);

        if (recoveredSigner == from) {
            _nonces[from] += 1;
            return true;
        } else {
            return false;
        }
    }

    function getEthSignedMessageHash(bytes32 _messageHash)
        public
        pure
        returns (bytes32)
    {
        return
            keccak256(
                abi.encodePacked(
                    "\x19Ethereum Signed Message:\n32",
                    _messageHash
                )
            );
    }

    function recoverSigner(bytes32 ethSignedMessageHash, bytes memory data)
        public
        pure
        returns (address)
    {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(data);

        return ecrecover(ethSignedMessageHash, v, r, s);
    }

    function splitSignature(bytes memory sig)
        public
        pure
        returns (
            bytes32 r,
            bytes32 s,
            uint8 v
        )
    {
        require(sig.length == 65, "invalid signature length");

        assembly {
            /*
            First 32 bytes stores the length of the signature

            add(sig, 32) = pointer of sig + 32
            effectively, skips first 32 bytes of signature

            mload(p) loads next 32 bytes starting at the memory address p into memory
            */

            // first 32 bytes, after the length prefix
            r := mload(add(sig, 32))
            // second 32 bytes
            s := mload(add(sig, 64))
            // final byte (first byte of the next 32 bytes)
            v := byte(0, mload(add(sig, 96)))
        }
        // implicitly return (r, s, v)
    }
}
