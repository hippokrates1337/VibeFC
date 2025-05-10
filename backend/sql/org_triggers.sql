-- Function to add organization creator as admin
CREATE OR REPLACE FUNCTION add_organization_creator_as_admin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for the function
CREATE TRIGGER organization_creator_admin_trigger
AFTER INSERT ON organizations
FOR EACH ROW
EXECUTE FUNCTION add_organization_creator_as_admin(); 